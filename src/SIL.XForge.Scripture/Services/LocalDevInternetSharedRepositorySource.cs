#nullable disable warnings
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Newtonsoft.Json.Linq;
using Paratext.Data;
using Paratext.Data.RegistryServerAccess;
using Paratext.Data.Repository;
using Paratext.Data.Users;
using SIL.XForge.Configuration;
using SIL.XForge.Scripture.Models;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// A local-development-only implementation of <see cref="IInternetSharedRepositorySource"/> that serves
/// configured dev projects from local Mercurial repositories stored at
/// <c>{SiteDir}/dev-paratext/repos/{projectId}/</c>. No real Paratext servers are contacted.
/// This is only used when <c>Auth:UseLocalAuth</c> is <c>true</c>.
/// </summary>
public class LocalDevInternetSharedRepositorySource : InternetSharedRepositorySource, IInternetSharedRepositorySource
{
    private readonly LocalDevParatextOptions _config;
    private readonly IHgWrapper _hgWrapper;
    private readonly string _devReposDir;
    private readonly string _ptUsername;

    public LocalDevInternetSharedRepositorySource(
        string ptUsername,
        LocalDevParatextOptions config,
        IHgWrapper hgWrapper,
        string devReposDir
    )
        : base(new SFParatextUser(ptUsername), "http://localhost")
    {
        _ptUsername = ptUsername;
        _config = config;
        _hgWrapper = hgWrapper;
        _devReposDir = devReposDir;
    }

    public void RefreshToken(string jwtToken)
    {
        // No-op for local dev: tokens are not validated by this source.
    }

    public InternetSharedRepositorySource AsInternetSharedRepositorySource() => this;

    public bool CanUserAuthenticateToPTArchives() => true;

    /// <summary>
    /// Returns a <see cref="SharedRepository"/> for each configured dev project that lists the current
    /// Paratext user in its roles.
    /// </summary>
    public override IEnumerable<SharedRepository> GetRepositories() => GetRepositories(null);

    public new IEnumerable<SharedRepository> GetRepositories(List<ProjectLicense> licenses)
    {
        foreach (LocalDevParatextProject project in _config.Projects)
        {
            if (!project.UserRoles.ContainsKey(_ptUsername))
                continue;

            string userRoleXml = BuildUserRoleXml(project);
            var permManager = new PermissionManager(userRoleXml);
            yield return new SharedRepository
            {
                SendReceiveId = HexId.FromStr(project.ParatextId),
                ScrTextName = project.ShortName,
                SourceUsers = permManager,
            };
        }
    }

    /// <summary>
    /// Returns <see cref="Paratext.Data.RegistryServerAccess.ProjectMetadata"/> for all configured dev
    /// projects that the current Paratext user has access to.
    /// </summary>
    public IEnumerable<ProjectMetadata> GetProjectsMetaData()
    {
        return _config.Projects.Where(p => p.UserRoles.ContainsKey(_ptUsername)).Select(p => BuildProjectMetadata(p));
    }

    /// <summary>
    /// Returns <see cref="ProjectMetadata"/> for the specified project,
    /// or <c>null</c> if the project is not configured or the user does not have access.
    /// </summary>
    public ProjectMetadata GetProjectMetadata(string paratextId)
    {
        LocalDevParatextProject project = _config.Projects.FirstOrDefault(p => p.ParatextId == paratextId);
        if (project == null || !project.UserRoles.ContainsKey(_ptUsername))
            return null;
        return BuildProjectMetadata(project);
    }

    /// <summary>
    /// Returns a valid (non-expired, non-revoked) <see cref="ProjectLicense"/>
    /// for the specified project, or <c>null</c> if not found.
    /// </summary>
    public ProjectLicense GetLicenseForUserProject(string paratextId)
    {
        LocalDevParatextProject project = _config.Projects.FirstOrDefault(p =>
            p.ParatextId == paratextId && p.UserRoles.ContainsKey(_ptUsername)
        );
        if (project == null)
            return null;

        // Build a minimal valid license that ParatextData will accept (not invalid, not expired, not revoked).
        DateTime farFuture = DateTime.UtcNow.AddYears(10);
        string licenseJson = $$$"""
            {
              "type": "translator",
              "licensedToParatextId": "{{{project.ParatextId}}}",
              "licensedToOrgs": [],
              "issuedAt": "{{{DateTime.UtcNow:o}}}",
              "expiresAt": "{{{farFuture:o}}}",
              "revoked": false
            }
            """;
        return new ProjectLicense(JObject.Parse(licenseJson));
    }

    /// <summary>
    /// Pulls changes from the local dev server Hg repository for the given project into
    /// <paramref name="repositoryPath"/>. If the server repo does not exist yet, it is initialized with a
    /// minimal Paratext project structure and an initial commit.
    /// </summary>
    public override string[] Pull(string repositoryPath, SharedRepository pullRepo)
    {
        string serverRepoDir = GetOrCreateServerRepo(pullRepo.SendReceiveId.Id, pullRepo.ScrTextName);

        string baseRev = _hgWrapper.GetLastPublicRevision(repositoryPath);
        string[] baseRevs = baseRev != null ? [baseRev] : [];
        byte[] bundle = _hgWrapper.Bundle(serverRepoDir, baseRevs);
        if (bundle.Length == 0)
            return [];

        string[] changeSets = _hgWrapper.Pull(repositoryPath, bundle);
        _hgWrapper.MarkSharedChangeSetsPublic(repositoryPath);
        return changeSets;
    }

    /// <summary>
    /// No-op for local dev: unlocking remote repository is not required.
    /// </summary>
    public override void UnlockRemoteRepository(SharedRepository sharedRepo) { }

    // Push is inherited from InternetSharedRepositorySource but we override it here to go to our local server repo.
    /// <summary>
    /// Pushes local draft commits from <paramref name="repositoryPath"/> to the local dev server Hg repository.
    /// </summary>
    public override void Push(string repositoryPath, SharedRepository pushRepo)
    {
        string serverRepoDir = GetOrCreateServerRepo(pushRepo.SendReceiveId.Id, pushRepo.ScrTextName);

        string baseRev = _hgWrapper.GetLastPublicRevision(repositoryPath);
        byte[] bundle = _hgWrapper.Bundle(repositoryPath, baseRev != null ? [baseRev] : []);
        if (bundle.Length == 0)
            return;

        // Apply the bundle to the server repo and mark all as public.
        _hgWrapper.Pull(serverRepoDir, bundle);
        _hgWrapper.MarkSharedChangeSetsPublic(serverRepoDir);
        _hgWrapper.MarkSharedChangeSetsPublic(repositoryPath);
    }

    // GetOutgoingRevisions is needed by SharingLogic; re-use the draft-based implementation from JwtInternetSharedRepositorySource.
    public override string[] GetOutgoingRevisions(string repository, SharedProject sharedProject) =>
        _hgWrapper.GetDraftRevisions(repository);

    /// <summary>
    /// Not needed for local dev. Returns an empty URI so the base class does not attempt HTTP access.
    /// </summary>
    public override string GetHgUri(SharedRepository sharedRepository) => string.Empty;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the path to the server-side Hg repository for the given project, creating and populating it
    /// with a minimal Paratext project structure if it does not already exist.
    /// </summary>
    private string GetOrCreateServerRepo(string paratextId, string shortName)
    {
        string serverRepoDir = Path.Combine(_devReposDir, paratextId);
        if (!Directory.Exists(Path.Combine(serverRepoDir, ".hg")))
        {
            InitializeServerRepo(serverRepoDir, paratextId, shortName);
        }
        return serverRepoDir;
    }

    /// <summary>
    /// Creates a minimal Paratext project directory under <paramref name="serverRepoDir"/>,
    /// initializes a Mercurial repository, and commits an initial changeset that is marked public so
    /// it can be served to clients via bundles.
    /// </summary>
    private void InitializeServerRepo(string serverRepoDir, string paratextId, string shortName)
    {
        LocalDevParatextProject project = _config.Projects.FirstOrDefault(p => p.ParatextId == paratextId);
        string fullName = project?.FullName ?? shortName;
        string languageIsoCode = project?.LanguageIsoCode ?? "eng";

        // The server-side Hg repo stores project files at its root. When the client calls
        // CloneProjectRepo, ParatextService.LocalProjectDir() already provides the path
        // "{SyncDir}/{paratextId}/target/" and passes that as repositoryPath to Pull(). So the files
        // from this server repo land directly in that directory — no extra subdirectory needed here.
        Directory.CreateDirectory(serverRepoDir);

        // Write the minimal Settings.xml so that ParatextData can identify the project by its GUID.
        // ParatextData's HexId.Id setter calls StringUtils.HexToByteArr internally, which only accepts
        // plain hex characters (no dashes). So the <Guid> element must use the 32-character hex format
        // without dashes, not the UUID format with dashes.
        string settingsXml = BuildSettingsXml(paratextId, shortName, fullName, languageIsoCode);
        File.WriteAllText(Path.Combine(serverRepoDir, "Settings.xml"), settingsXml, Encoding.UTF8);

        // Write a ProjectUsers.xml so that the ScrText reports a valid user role without needing to
        // call SearchForBestProjectUsersData against a remote server.
        string usersXml = BuildProjectUsersXml(project);
        File.WriteAllText(Path.Combine(serverRepoDir, "ProjectUsers.xml"), usersXml, Encoding.UTF8);

        // Initialize the Hg repo, add all files, and commit.
        _hgWrapper.Init(serverRepoDir);
        HgWrapper.RunCommand(serverRepoDir, "add");
        HgWrapper.RunCommand(serverRepoDir, """commit -m "Initial dev project" -u "DevServer" """);

        // Mark the initial commit as public so clients know it has been "synced" to the server.
        _hgWrapper.MarkSharedChangeSetsPublic(serverRepoDir);
    }

    /// <summary>
    /// Builds a minimal Paratext <c>Settings.xml</c> containing the fields that ParatextData requires
    /// to identify a project and read its basic properties.
    /// The <paramref name="paratextId"/> must be in the 32-character hex format (no dashes), as
    /// ParatextData's <c>HexId.Id</c> setter only accepts plain hexadecimal characters.
    /// </summary>
    internal static string BuildSettingsXml(
        string paratextId,
        string shortName,
        string fullName,
        string languageIsoCode
    )
    {
        return $"""
            <?xml version="1.0" encoding="utf-8"?>
            <ScriptureText>
              <Guid>{paratextId}</Guid>
              <Name>{shortName}</Name>
              <FullName>{fullName}</FullName>
              <DefaultStylesheet>usfm.sty</DefaultStylesheet>
              <Editable>True</Editable>
              <Encoding>65001</Encoding>
              <LanguageIsoCode>{languageIsoCode}::</LanguageIsoCode>
              <Versification>4</Versification>
              <Naming BookNameForm="40MAT" PostPart=".SFM" PrePart="" />
            </ScriptureText>
            """;
    }

    /// <summary>
    /// Builds a <c>ProjectUsers.xml</c> that grants each configured user their role in this project.
    /// This prevents <c>ParatextService.SendReceiveAsync</c> from calling
    /// <c>SharingLogic.SearchForBestProjectUsersData</c> against a real server.
    /// </summary>
    private static string BuildProjectUsersXml(LocalDevParatextProject project)
    {
        if (project == null)
        {
            return """<ProjectUserAccess PeerSharing="false" />""";
        }

        var sb = new StringBuilder();
        sb.AppendLine("""<ProjectUserAccess PeerSharing="true">""");
        bool isFirst = true;
        foreach ((string username, string role) in project.UserRoles)
        {
            // Map Paratext role strings (e.g. "pt_administrator") to the UserRoles enum name.
            string roleValue = MapToUserRole(role);
            sb.AppendLine(
                $"""  <User UserName="{username}" FirstUser="{isFirst.ToString().ToLower()}" UnregisteredUser="false">"""
            );
            sb.AppendLine($"""    <Role>{roleValue}</Role><AllBooks>true</AllBooks>""");
            sb.AppendLine("""    <Books /><Permissions /><AutomaticBooks /><AutomaticPermissions />""");
            sb.AppendLine("""  </User>""");
            isFirst = false;
        }
        sb.AppendLine("""</ProjectUserAccess>""");
        return sb.ToString();
    }

    /// <summary>
    /// Maps a Paratext role API string to the <c>UserRoles</c> enum name used in <c>ProjectUsers.xml</c>.
    /// </summary>
    private static string MapToUserRole(string apiRole) =>
        apiRole switch
        {
            "pt_administrator" => "Administrator",
            "pt_translator" => "Translator",
            "pt_consultant" => "Consultant",
            "pt_observer" => "Observer",
            _ => "Translator",
        };

    /// <summary>
    /// Builds the <c>ProjectUserAccess</c> XML string for the <see cref="PermissionManager"/> used in
    /// <see cref="SharedRepository.SourceUsers"/>. This is the format that ParatextData expects when
    /// constructing a <see cref="PermissionManager"/> directly from XML.
    /// </summary>
    private static string BuildUserRoleXml(LocalDevParatextProject project)
    {
        var sb = new StringBuilder();
        sb.AppendLine("""<ProjectUserAccess PeerSharing="true">""");
        bool isFirst = true;
        foreach ((string username, string role) in project.UserRoles)
        {
            string roleValue = MapToUserRole(role);
            sb.AppendLine(
                $"""  <User UserName="{username}" FirstUser="{isFirst.ToString().ToLower()}" UnregisteredUser="false">"""
            );
            sb.AppendLine($"""    <Role>{roleValue}</Role><AllBooks>true</AllBooks>""");
            sb.AppendLine("""    <Books /><Permissions /><AutomaticBooks /><AutomaticPermissions />""");
            sb.AppendLine("""  </User>""");
            isFirst = false;
        }
        sb.AppendLine("""</ProjectUserAccess>""");
        return sb.ToString();
    }

    private static ProjectMetadata BuildProjectMetadata(LocalDevParatextProject project)
    {
        string json = $$$"""
            {
              "identification_name": "{{{project.FullName}}}",
              "identification_systemId": [{"type": "paratext", "text": "{{{project.ParatextId}}}"}],
              "language_iso": "{{{project.LanguageIsoCode}}}"
            }
            """;
        return new Paratext.Data.RegistryServerAccess.ProjectMetadata(JObject.Parse(json));
    }
}

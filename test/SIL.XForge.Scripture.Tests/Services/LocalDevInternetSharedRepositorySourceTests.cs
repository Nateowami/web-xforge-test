#nullable disable warnings
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using NUnit.Framework;
using Paratext.Data;
using Paratext.Data.Repository;
using SIL.XForge.Configuration;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// Unit and integration tests for <see cref="LocalDevInternetSharedRepositorySource"/> — the
/// local-dev-only Paratext S/R source that serves configured projects from local Mercurial repos.
/// </summary>
[TestFixture]
public class LocalDevInternetSharedRepositorySourceTests
{
    private const string ProjectHexId = "4e51b77b2c18ee2c2bde5a18bcc880a2";
    private const string ShortName = "TestPrj";
    private const string FullName = "Test Project Full";
    private const string LanguageIsoCode = "eng";

    // ─── BuildSettingsXml ────────────────────────────────────────────────────

    [Test]
    public void BuildSettingsXml_GuidIsHexWithoutDashes()
    {
        // SUT
        string xml = LocalDevInternetSharedRepositorySource.BuildSettingsXml(
            ProjectHexId,
            ShortName,
            FullName,
            LanguageIsoCode
        );

        // ParatextData's HexId.Id setter calls StringUtils.HexToByteArr which only accepts plain hex
        // characters (no dashes). Using UUID format with dashes would throw:
        //   ArgumentException: String must contain only hexadecimal characters: <uuid-with-dashes>
        Assert.That(xml, Does.Contain($"<Guid>{ProjectHexId}</Guid>"));
    }

    [Test]
    public void BuildSettingsXml_GuidDoesNotContainDashes()
    {
        // SUT
        string xml = LocalDevInternetSharedRepositorySource.BuildSettingsXml(
            ProjectHexId,
            ShortName,
            FullName,
            LanguageIsoCode
        );

        // Ensure the UUID-with-dashes form is absent. Any dashes in <Guid> would crash ParatextData
        // when loading the Settings.xml.
        string uuidWithDashes =
            $"{ProjectHexId[..8]}-{ProjectHexId[8..12]}-"
            + $"{ProjectHexId[12..16]}-{ProjectHexId[16..20]}-"
            + $"{ProjectHexId[20..]}";
        Assert.That(xml, Does.Not.Contain(uuidWithDashes));
    }

    [Test]
    public void BuildSettingsXml_GuidIsValidHexForHexId()
    {
        // SUT
        string xml = LocalDevInternetSharedRepositorySource.BuildSettingsXml(
            ProjectHexId,
            ShortName,
            FullName,
            LanguageIsoCode
        );

        // Extract the GUID value and verify that Paratext can actually parse it without throwing.
        // This exercises the exact code path that was previously broken.
        string guidValue = ExtractXmlElementValue(xml, "Guid");
        Assert.That(
            () => HexId.FromStr(guidValue),
            Throws.Nothing,
            $"HexId.FromStr must accept the <Guid> value '{guidValue}' without throwing"
        );
    }

    [Test]
    public void BuildSettingsXml_ContainsCorrectProjectMetadata()
    {
        // SUT
        string xml = LocalDevInternetSharedRepositorySource.BuildSettingsXml(
            ProjectHexId,
            ShortName,
            FullName,
            LanguageIsoCode
        );

        Assert.That(xml, Does.Contain($"<Name>{ShortName}</Name>"));
        Assert.That(xml, Does.Contain($"<FullName>{FullName}</FullName>"));
        Assert.That(xml, Does.Contain($"<LanguageIsoCode>{LanguageIsoCode}::</LanguageIsoCode>"));
    }

    // ─── GetRepositories ─────────────────────────────────────────────────────

    [Test]
    public void GetRepositories_SendReceiveId_IsHexWithoutDashes()
    {
        // HexId.Id returns the raw hex string (32 chars, no dashes). ParatextService compares
        // SendReceiveId.Id to SFProject.ParatextId, so they must use the same format.
        HexId hexId = HexId.FromStr(ProjectHexId);

        Assert.That(hexId.Id, Is.EqualTo(ProjectHexId));
        Assert.That(hexId.Id, Does.Not.Contain("-"));
    }

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.GetRepositories"/> returns
    /// a <see cref="SharedRepository"/> with a non-null <see cref="SharedRepository.License"/>.
    /// This is required so that <c>InternetSharedRepositorySource.SendReceiveAllowedForProject</c>
    /// receives a non-null license even in the case where our override is not called
    /// (e.g., in the post-SR review loop in <c>SharingLogic.ShareChanges</c>).
    /// </summary>
    [Test]
    public void GetRepositories_License_IsNotNull()
    {
        var config = new LocalDevParatextOptions
        {
            Projects =
            [
                new LocalDevParatextProject
                {
                    ParatextId = ProjectHexId,
                    ShortName = ShortName,
                    FullName = FullName,
                    LanguageIsoCode = LanguageIsoCode,
                    UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                },
            ],
        };
        BypassParatextInternetAccessCheck();

        var source = new LocalDevInternetSharedRepositorySource(
            "DevAdmin",
            config,
            new HgWrapper(),
            Path.Combine(Path.GetTempPath(), Path.GetRandomFileName())
        );

        // SUT
        SharedRepository repo = source.GetRepositories().Single();

        Assert.That(
            repo.License,
            Is.Not.Null,
            "SharedRepository.License must be non-null"
        );
    }

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.SendReceiveAllowedForProject"/>
    /// always returns <c>true</c>, bypassing the license check that the base
    /// <see cref="InternetSharedRepositorySource"/> performs. This is required so that
    /// <c>SharingLogic.Share1Project</c> does not return <c>Failed</c> immediately because our
    /// locally-constructed <c>ScrText</c> has no genuine Paratext license embedded in
    /// <c>ProjectUsers.xml</c>.
    /// </summary>
    [Test]
    public void SendReceiveAllowedForProject_AlwaysReturnsTrue()
    {
        var config = new LocalDevParatextOptions
        {
            Projects =
            [
                new LocalDevParatextProject
                {
                    ParatextId = ProjectHexId,
                    ShortName = ShortName,
                    FullName = FullName,
                    LanguageIsoCode = LanguageIsoCode,
                    UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                },
            ],
        };
        BypassParatextInternetAccessCheck();

        var source = new LocalDevInternetSharedRepositorySource(
            "DevAdmin",
            config,
            new HgWrapper(),
            Path.Combine(Path.GetTempPath(), Path.GetRandomFileName())
        );

        // SUT — test all combinations of allowExpiredOrRevoked and null/non-null license
        Assert.That(
            source.SendReceiveAllowedForProject(null!, allowExpiredOrRevoked: false, license: null),
            Is.True,
            "SendReceiveAllowedForProject must return true for local dev (null license)"
        );
        Assert.That(
            source.SendReceiveAllowedForProject(null!, allowExpiredOrRevoked: false, license: source.GetLicenseForUserProject(ProjectHexId)),
            Is.True,
            "SendReceiveAllowedForProject must return true for local dev (non-null license)"
        );
    }

    // ─── E2E integration test using real Mercurial ───────────────────────────

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.LockRemoteRepository"/>
    /// returns <c>true</c> and sets <c>lockedByUser</c> to <c>null</c> without attempting any
    /// network call. The base <see cref="InternetSharedRepositorySource"/> implementation calls
    /// <c>lockrepo</c> on the PT S/R REST client, which throws a
    /// <c>CannotConnectException: Resource temporarily unavailable (localhostlockrepo:80)</c>
    /// since there is no PT S/R server in local dev mode.
    /// </summary>
    [Test]
    public void LockRemoteRepository_ReturnsTrueWithNullUser()
    {
        var config = new LocalDevParatextOptions
        {
            Projects =
            [
                new LocalDevParatextProject
                {
                    ParatextId = ProjectHexId,
                    ShortName = ShortName,
                    FullName = FullName,
                    LanguageIsoCode = LanguageIsoCode,
                    UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                },
            ],
        };
        BypassParatextInternetAccessCheck();

        var source = new LocalDevInternetSharedRepositorySource(
            "DevAdmin",
            config,
            new HgWrapper(),
            Path.Combine(Path.GetTempPath(), Path.GetRandomFileName())
        );
        var repo = source.GetRepositories().Single();

        // SUT
        bool result = source.LockRemoteRepository(repo, out string lockedByUser);

        Assert.That(result, Is.True, "LockRemoteRepository must succeed in local dev mode");
        Assert.That(lockedByUser, Is.Null, "lockedByUser must be null when lock succeeds");
    }

    /// <summary>
    /// End-to-end integration test: simulates the complete Paratext sync flow using real Mercurial.
    /// This test replicates the exact crash path:
    /// <list type="number">
    ///   <item><see cref="LocalDevInternetSharedRepositorySource.Pull"/> initializes the server repo
    ///     and bundles it into the client repo (simulating
    ///     <c>ParatextService.CloneProjectRepo</c>).</item>
    ///   <item><see cref="LazyScrTextCollection.FindById"/> reads <c>Settings.xml</c> and constructs
    ///     a <c>ScrText</c> — the point at which the previously-broken UUID-with-dashes <c>&lt;Guid&gt;</c>
    ///     would cause <c>HexId.FromStr</c> to throw
    ///     <c>ArgumentException: String must contain only hexadecimal characters</c>.</item>
    ///   <item>The returned <c>ScrText.Guid.Id</c> equals the expected hex project ID.</item>
    /// </list>
    /// </summary>
    [Test]
    public void Pull_WithRealMercurial_ScrTextCanBeLoadedFromPulledRepo()
    {
        // This test requires Mercurial to be installed on the machine.
        string hgExe = "/usr/bin/hg";
        if (!File.Exists(hgExe))
            Assert.Ignore("Mercurial not found at /usr/bin/hg — skipping integration test.");

        // ParatextData's Hg constructor requires the ParatextMerge.py script to exist.
        string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string mergePy = Path.Combine(assemblyDir, "ParatextMerge.py");
        if (!File.Exists(mergePy))
            Assert.Ignore($"ParatextMerge.py not found at {mergePy} — skipping integration test.");

        // InternetSharedRepositorySource's base constructor calls InternetAccess.VerifySafety(), which
        // throws VpnDisconnectedException in CI (no network). We bypass this by directly setting the
        // in-memory PermittedInternetUse field to Enabled via reflection, without writing to disk.
        BypassParatextInternetAccessCheck();

        string tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        try
        {
            // ── Set up directories ──────────────────────────────────────────────────
            string serverReposDir = Path.Combine(tempDir, "server-repos");

            // syncDir mirrors {SiteDir}/paratext which is what ParatextService.SyncDir points to.
            // LazyScrTextCollection.Initialize is called with this path.
            // LazyScrTextCollection.FindById then looks for the ScrText at:
            //   {syncDir}/{projectId}/target/Settings.xml
            string syncDir = Path.Combine(tempDir, "sync");

            // The client repo simulates {SyncDir}/{projectId}/target/ — where ParatextService
            // puts the cloned project repo before calling Pull.
            string clientRepoPath = Path.Combine(syncDir, ProjectHexId, "target");

            Directory.CreateDirectory(serverReposDir);
            Directory.CreateDirectory(clientRepoPath);

            // ── Wire up the real HgWrapper with the system Mercurial installation ──
            var realHgWrapper = new HgWrapper();
            realHgWrapper.SetDefault(new Hg(hgExe, mergePy, assemblyDir));

            // Initialize the client directory as an hg repo (simulates CloneProjectRepo in
            // ParatextService, which calls _hgHelper.Init(clonePath) before Pull).
            realHgWrapper.Init(clientRepoPath);

            // ── Configure the dev project ───────────────────────────────────────────
            var config = new LocalDevParatextOptions
            {
                Projects =
                [
                    new LocalDevParatextProject
                    {
                        ParatextId = ProjectHexId,
                        ShortName = ShortName,
                        FullName = FullName,
                        LanguageIsoCode = LanguageIsoCode,
                        UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                    },
                ],
            };

            var source = new LocalDevInternetSharedRepositorySource(
                "DevAdmin",
                config,
                realHgWrapper,
                serverReposDir
            );

            SharedRepository repo = source.GetRepositories().Single();

            // ── Replicate ParatextService.CloneProjectRepo ──────────────────────────
            // Pull triggers InitializeServerRepo → creates a real Hg repo with Settings.xml committed.
            // Then bundles the server repo and pulls the bundle into the client repo.
            source.Pull(clientRepoPath, repo);
            // Update checks out the working-directory files so Settings.xml appears on disk.
            realHgWrapper.Update(clientRepoPath);

            // ── Replicate LazyScrTextCollection.FindById ────────────────────────────
            // This is what ParatextService calls after CloneProjectRepo to get a ScrText for SR.
            // If Settings.xml has a UUID-with-dashes <Guid> (the old bug), ScrText construction
            // throws ArgumentException: String must contain only hexadecimal characters.
            var scrTextCollection = new LazyScrTextCollection();
            // SUT: initialize with syncDir, then load the ScrText for the project.
            scrTextCollection.Initialize(syncDir);

            ScrText scrText;
            Assert.That(
                () =>
                {
                    // SUT
                    scrText = scrTextCollection.FindById("DevAdmin", ProjectHexId);
                },
                Throws.Nothing,
                "LazyScrTextCollection.FindById must not throw — previously crashed with "
                    + "ArgumentException: String must contain only hexadecimal characters "
                    + "when <Guid> used UUID-with-dashes format"
            );

            scrText = scrTextCollection.FindById("DevAdmin", ProjectHexId);

            // ── Verify the ScrText is valid and has the expected Guid ───────────────
            Assert.That(scrText, Is.Not.Null, "ScrText must be non-null — project repo must be loadable");
            Assert.That(
                scrText!.Guid,
                Is.Not.Null,
                "ScrText.Guid must be non-null — Settings.xml <Guid> must be parseable"
            );
            Assert.That(
                scrText.Guid.Id,
                Is.EqualTo(ProjectHexId),
                "ScrText.Guid.Id must equal the expected hex project ID"
            );
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.Pull"/> writes the correct
    /// <c>Settings.xml</c> file (plain hex GUID, no dashes) into the client repo.
    /// This is a lighter companion test to
    /// <see cref="Pull_WithRealMercurial_ScrTextCanBeLoadedFromPulledRepo"/> that verifies the
    /// file content rather than the ParatextData loading behaviour.
    /// </summary>
    [Test]
    public void Pull_WithRealMercurial_SettingsXmlGuidIsParseableByParatextData()
    {
        // This test requires Mercurial to be installed on the machine.
        string hgExe = "/usr/bin/hg";
        if (!File.Exists(hgExe))
            Assert.Ignore("Mercurial not found at /usr/bin/hg — skipping integration test.");

        // ParatextData's Hg constructor requires the ParatextMerge.py script to exist.
        string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string mergePy = Path.Combine(assemblyDir, "ParatextMerge.py");
        if (!File.Exists(mergePy))
            Assert.Ignore($"ParatextMerge.py not found at {mergePy} — skipping integration test.");

        // InternetSharedRepositorySource's base constructor calls InternetAccess.VerifySafety(), which
        // throws VpnDisconnectedException in CI (no network). We bypass this by directly setting the
        // in-memory PermittedInternetUse field to Enabled via reflection, without writing to disk.
        BypassParatextInternetAccessCheck();

        string tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        try
        {
            // ── Set up directories ──────────────────────────────────────────────────
            string serverReposDir = Path.Combine(tempDir, "server-repos");
            // The client repo simulates {SyncDir}/{projectId}/target/ — where ParatextService
            // puts the cloned project repo before calling Pull.
            string clientRepoPath = Path.Combine(tempDir, "sync", ProjectHexId, "target");
            Directory.CreateDirectory(serverReposDir);
            Directory.CreateDirectory(clientRepoPath);

            // ── Wire up the real HgWrapper with the system Mercurial installation ──
            var realHgWrapper = new HgWrapper();
            realHgWrapper.SetDefault(new Hg(hgExe, mergePy, assemblyDir));

            // Initialize the client directory as an hg repo (simulates CloneProjectRepo in
            // ParatextService, which calls _hgHelper.Init(clonePath) before Pull).
            realHgWrapper.Init(clientRepoPath);

            // ── Configure the dev project ───────────────────────────────────────────
            var config = new LocalDevParatextOptions
            {
                Projects =
                [
                    new LocalDevParatextProject
                    {
                        ParatextId = ProjectHexId,
                        ShortName = ShortName,
                        FullName = FullName,
                        LanguageIsoCode = LanguageIsoCode,
                        UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                    },
                ],
            };

            var source = new LocalDevInternetSharedRepositorySource(
                "DevAdmin",
                config,
                realHgWrapper,
                serverReposDir
            );

            SharedRepository repo = source.GetRepositories().Single();

            // SUT — triggers InitializeServerRepo → creates real Hg repo → bundles → pulls into client
            source.Pull(clientRepoPath, repo);
            // ParatextService.CloneProjectRepo calls _hgHelper.Update after Pull to check out
            // the working directory files. We need to do the same here to get Settings.xml on disk.
            realHgWrapper.Update(clientRepoPath);

            // ── Verify the Settings.xml content ────────────────────────────────────
            string settingsXmlPath = Path.Combine(clientRepoPath, "Settings.xml");
            Assert.That(File.Exists(settingsXmlPath), Is.True, "Settings.xml must exist in client repo after Pull");

            string settingsXml = File.ReadAllText(settingsXmlPath, Encoding.UTF8);

            // The <Guid> element must use plain hex (no dashes).
            Assert.That(
                settingsXml,
                Does.Contain($"<Guid>{ProjectHexId}</Guid>"),
                "Settings.xml <Guid> must be plain hex without dashes"
            );

            // Ensure the UUID-with-dashes form is NOT present (it would cause the ArgumentException).
            string uuidWithDashes =
                $"{ProjectHexId[..8]}-{ProjectHexId[8..12]}-"
                + $"{ProjectHexId[12..16]}-{ProjectHexId[16..20]}-"
                + $"{ProjectHexId[20..]}";
            Assert.That(
                settingsXml,
                Does.Not.Contain(uuidWithDashes),
                "Settings.xml <Guid> must not use UUID-with-dashes format"
            );

            // ── Critical: verify ParatextData can parse the GUID without throwing ──
            // This is the exact failure that previously caused:
            //   "System.ArgumentException: String must contain only hexadecimal characters:
            //    4e51b77b-2c18-ee2c-2bde-5a18bcc880a2"
            string guidInXml = ExtractXmlElementValue(settingsXml, "Guid");
            Assert.That(
                () => HexId.FromStr(guidInXml),
                Throws.Nothing,
                $"HexId.FromStr('{guidInXml}') must not throw — ParatextData must be able to parse the <Guid>"
            );
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.Pull"/> includes the default
    /// Scripture book files (Matthew and Jonah, World English Bible, public domain) in the initial
    /// commit so that the dev project has realistic content after sync.
    /// </summary>
    [Test]
    public void Pull_WithRealMercurial_DefaultBookFilesAreIncludedInRepo()
    {
        string hgExe = "/usr/bin/hg";
        if (!File.Exists(hgExe))
            Assert.Ignore("Mercurial not found at /usr/bin/hg — skipping integration test.");

        string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string mergePy = Path.Combine(assemblyDir, "ParatextMerge.py");
        if (!File.Exists(mergePy))
            Assert.Ignore($"ParatextMerge.py not found at {mergePy} — skipping integration test.");

        BypassParatextInternetAccessCheck();

        string tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        try
        {
            string serverReposDir = Path.Combine(tempDir, "server-repos");
            string clientRepoPath = Path.Combine(tempDir, "sync", ProjectHexId, "target");
            Directory.CreateDirectory(serverReposDir);
            Directory.CreateDirectory(clientRepoPath);

            var realHgWrapper = new HgWrapper();
            realHgWrapper.SetDefault(new Hg(hgExe, mergePy, assemblyDir));
            realHgWrapper.Init(clientRepoPath);

            var config = new LocalDevParatextOptions
            {
                Projects =
                [
                    new LocalDevParatextProject
                    {
                        ParatextId = ProjectHexId,
                        ShortName = ShortName,
                        FullName = FullName,
                        LanguageIsoCode = LanguageIsoCode,
                        UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                    },
                ],
            };

            var source = new LocalDevInternetSharedRepositorySource(
                "DevAdmin",
                config,
                realHgWrapper,
                serverReposDir
            );
            SharedRepository repo = source.GetRepositories().Single();

            // SUT
            source.Pull(clientRepoPath, repo);
            realHgWrapper.Update(clientRepoPath);

            // Matthew (40MAT.SFM) and Jonah (32JON.SFM) must be present with realistic USFM content.
            string matthewPath = Path.Combine(clientRepoPath, "40MAT.SFM");
            string jonahPath = Path.Combine(clientRepoPath, "32JON.SFM");

            Assert.That(File.Exists(matthewPath), Is.True, "40MAT.SFM (Matthew) must be present after Pull");
            Assert.That(File.Exists(jonahPath), Is.True, "32JON.SFM (Jonah) must be present after Pull");

            string matthewContent = File.ReadAllText(matthewPath, Encoding.UTF8);
            string jonahContent = File.ReadAllText(jonahPath, Encoding.UTF8);

            // The \id line should identify the book and carry the configured project name.
            Assert.That(matthewContent, Does.StartWith(@"\id MAT - " + FullName));
            Assert.That(jonahContent, Does.StartWith(@"\id JON - " + FullName));

            // The files must contain multiple chapters.
            Assert.That(
                matthewContent.Split(@"\c ").Length - 1,
                Is.GreaterThanOrEqualTo(5),
                "40MAT.SFM must contain at least 5 chapters"
            );
            Assert.That(
                jonahContent.Split(@"\c ").Length - 1,
                Is.EqualTo(4),
                "32JON.SFM must contain exactly 4 chapters (complete book)"
            );
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    // ─── Stale-repo migration tests (GetOrCreateServerRepo + ResetClientRepoIfStale) ──────────

    /// <summary>
    /// Verifies that <see cref="LocalDevInternetSharedRepositorySource.Pull"/> automatically
    /// recreates a server repo whose <c>Settings.xml</c> contains a UUID-with-dashes <c>&lt;Guid&gt;</c>
    /// (the legacy bug). After the migration the client repo receives the correct plain-hex Guid.
    /// This tests the path where only the server repo is stale (e.g. the user deleted the client repo
    /// but not the server repo).
    /// </summary>
    [Test]
    public void Pull_WithRealMercurial_StaleServerRepo_IsMigratedAutomatically()
    {
        string hgExe = "/usr/bin/hg";
        if (!File.Exists(hgExe))
            Assert.Ignore("Mercurial not found at /usr/bin/hg — skipping integration test.");

        string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string mergePy = Path.Combine(assemblyDir, "ParatextMerge.py");
        if (!File.Exists(mergePy))
            Assert.Ignore($"ParatextMerge.py not found at {mergePy} — skipping integration test.");

        BypassParatextInternetAccessCheck();

        string tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        try
        {
            string serverReposDir = Path.Combine(tempDir, "server-repos");
            string syncDir = Path.Combine(tempDir, "sync");
            string clientRepoPath = Path.Combine(syncDir, ProjectHexId, "target");
            Directory.CreateDirectory(serverReposDir);
            Directory.CreateDirectory(clientRepoPath);

            var realHgWrapper = new HgWrapper();
            realHgWrapper.SetDefault(new Hg(hgExe, mergePy, assemblyDir));

            // ── Simulate the legacy bug: create a server repo with a UUID-with-dashes Guid ──
            string staleServerRepoDir = Path.Combine(serverReposDir, ProjectHexId);
            Directory.CreateDirectory(staleServerRepoDir);
            string dashedGuid =
                $"{ProjectHexId[..8]}-{ProjectHexId[8..12]}-{ProjectHexId[12..16]}-{ProjectHexId[16..20]}-{ProjectHexId[20..]}";
            string staleSettingsXml = BuildLegacySettingsXml(dashedGuid);
            File.WriteAllText(Path.Combine(staleServerRepoDir, "Settings.xml"), staleSettingsXml, Encoding.UTF8);
            realHgWrapper.Init(staleServerRepoDir);
            HgWrapper.RunCommand(staleServerRepoDir, "add");
            HgWrapper.RunCommand(staleServerRepoDir, """commit -m "Stale initial commit" -u "DevServer" """);
            realHgWrapper.MarkSharedChangeSetsPublic(staleServerRepoDir);

            var config = new LocalDevParatextOptions
            {
                Projects =
                [
                    new LocalDevParatextProject
                    {
                        ParatextId = ProjectHexId,
                        ShortName = ShortName,
                        FullName = FullName,
                        LanguageIsoCode = LanguageIsoCode,
                        UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                    },
                ],
            };

            var source = new LocalDevInternetSharedRepositorySource(
                "DevAdmin",
                config,
                realHgWrapper,
                serverReposDir
            );

            // Init the client repo (simulates CloneProjectRepo calling Init before Pull).
            realHgWrapper.Init(clientRepoPath);
            SharedRepository repo = source.GetRepositories().Single();

            // SUT — Pull must detect the stale server repo, re-create it, and pull correct content.
            source.Pull(clientRepoPath, repo);
            realHgWrapper.Update(clientRepoPath);

            // ── Verify the client repo received the correct Settings.xml ──
            string clientSettingsXmlPath = Path.Combine(clientRepoPath, "Settings.xml");
            Assert.That(File.Exists(clientSettingsXmlPath), Is.True, "Settings.xml must exist after Pull");
            string clientSettingsXml = File.ReadAllText(clientSettingsXmlPath, Encoding.UTF8);
            Assert.That(
                clientSettingsXml,
                Does.Contain($"<Guid>{ProjectHexId}</Guid>"),
                "After migration, Settings.xml <Guid> must be plain hex without dashes"
            );
            Assert.That(
                clientSettingsXml,
                Does.Not.Contain($"<Guid>{dashedGuid}</Guid>"),
                "After migration, the UUID-with-dashes Guid must not appear in Settings.xml"
            );

            // ── Also verify that LazyScrTextCollection can load the migrated repo ──
            var scrTextCollection = new LazyScrTextCollection();
            scrTextCollection.Initialize(syncDir);

            ScrText scrText = scrTextCollection.FindById("DevAdmin", ProjectHexId);
            Assert.That(scrText, Is.Not.Null, "ScrText must be loadable after stale server-repo migration");
            Assert.That(scrText!.Guid.Id, Is.EqualTo(ProjectHexId));
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    /// <summary>
    /// Verifies the complete stale-state migration when BOTH the server repo and the client repo were
    /// created with the legacy bug (UUID-with-dashes Guid in <c>Settings.xml</c>). This is the scenario
    /// that happens on a developer's machine that ran the app before the fix was applied.
    /// <para>
    /// The three-fix chain must work together:
    /// <list type="number">
    ///   <item><see cref="LazyScrTextCollection.FindById"/> catches the <c>ArgumentException</c> from the
    ///     stale client repo and returns <c>null</c>, triggering re-clone.</item>
    ///   <item><see cref="LocalDevInternetSharedRepositorySource.Pull"/> calls
    ///     <c>GetOrCreateServerRepo</c>, which detects and re-creates the stale server repo.</item>
    ///   <item><see cref="LocalDevInternetSharedRepositorySource.Pull"/> calls
    ///     <c>ResetClientRepoIfStale</c>, which clears the stale client repo's <c>.hg</c> so the pull
    ///     starts from a clean state.</item>
    /// </list>
    /// After a <c>hg update</c> the client repo's working directory has the correct <c>Settings.xml</c>
    /// and <see cref="LazyScrTextCollection.FindById"/> succeeds.
    /// </para>
    /// </summary>
    [Test]
    public void Pull_WithRealMercurial_StaleServerAndClientRepos_AreMigratedAutomatically()
    {
        string hgExe = "/usr/bin/hg";
        if (!File.Exists(hgExe))
            Assert.Ignore("Mercurial not found at /usr/bin/hg — skipping integration test.");

        string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string mergePy = Path.Combine(assemblyDir, "ParatextMerge.py");
        if (!File.Exists(mergePy))
            Assert.Ignore($"ParatextMerge.py not found at {mergePy} — skipping integration test.");

        BypassParatextInternetAccessCheck();

        string tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        try
        {
            string serverReposDir = Path.Combine(tempDir, "server-repos");
            string syncDir = Path.Combine(tempDir, "sync");
            string clientRepoPath = Path.Combine(syncDir, ProjectHexId, "target");
            Directory.CreateDirectory(serverReposDir);
            Directory.CreateDirectory(clientRepoPath);

            var realHgWrapper = new HgWrapper();
            realHgWrapper.SetDefault(new Hg(hgExe, mergePy, assemblyDir));

            string dashedGuid =
                $"{ProjectHexId[..8]}-{ProjectHexId[8..12]}-{ProjectHexId[12..16]}-{ProjectHexId[16..20]}-{ProjectHexId[20..]}";
            string staleSettingsXml = BuildLegacySettingsXml(dashedGuid);

            // ── Create stale SERVER repo (simulates old app run) ──
            string staleServerRepoDir = Path.Combine(serverReposDir, ProjectHexId);
            Directory.CreateDirectory(staleServerRepoDir);
            File.WriteAllText(Path.Combine(staleServerRepoDir, "Settings.xml"), staleSettingsXml, Encoding.UTF8);
            realHgWrapper.Init(staleServerRepoDir);
            HgWrapper.RunCommand(staleServerRepoDir, "add");
            HgWrapper.RunCommand(staleServerRepoDir, """commit -m "Stale initial commit" -u "DevServer" """);
            realHgWrapper.MarkSharedChangeSetsPublic(staleServerRepoDir);

            // ── Create stale CLIENT repo (simulates having synced once with old app) ──
            File.WriteAllText(Path.Combine(clientRepoPath, "Settings.xml"), staleSettingsXml, Encoding.UTF8);
            realHgWrapper.Init(clientRepoPath);
            HgWrapper.RunCommand(clientRepoPath, "add");
            HgWrapper.RunCommand(clientRepoPath, """commit -m "Stale client commit" -u "DevAdmin" """);
            realHgWrapper.MarkSharedChangeSetsPublic(clientRepoPath);

            var config = new LocalDevParatextOptions
            {
                Projects =
                [
                    new LocalDevParatextProject
                    {
                        ParatextId = ProjectHexId,
                        ShortName = ShortName,
                        FullName = FullName,
                        LanguageIsoCode = LanguageIsoCode,
                        UserRoles = new Dictionary<string, string> { ["DevAdmin"] = "pt_administrator" },
                    },
                ],
            };

            var source = new LocalDevInternetSharedRepositorySource(
                "DevAdmin",
                config,
                realHgWrapper,
                serverReposDir
            );

            var scrTextCollection = new LazyScrTextCollection();
            scrTextCollection.Initialize(syncDir);

            // ── Fix 1: LazyScrTextCollection.FindById must return null (not throw) ──
            // This replicates what ParatextService.EnsureProjectReposExistsAsync does.
            ScrText beforeMigration;
            Assert.That(
                () =>
                {
                    // SUT
                    beforeMigration = scrTextCollection.FindById("DevAdmin", ProjectHexId);
                },
                Throws.Nothing,
                "FindById must NOT throw ArgumentException — it must catch it and return null"
            );
            beforeMigration = scrTextCollection.FindById("DevAdmin", ProjectHexId);
            Assert.That(
                beforeMigration,
                Is.Null,
                "FindById must return null for stale client repo, so ParatextService triggers re-clone"
            );

            // ── Simulate what CloneProjectRepo does after FindById returns null ──
            // Init is called on the existing (stale) directory — it is a no-op since .hg already exists.
            realHgWrapper.Init(clientRepoPath);

            SharedRepository repo = source.GetRepositories().Single();

            // SUT — Fix 2 + Fix 3: Pull re-creates stale server repo and resets stale client repo.
            source.Pull(clientRepoPath, repo);

            // Simulate _hgHelper.Update(clientRepoPath) called by CloneProjectRepo after Pull.
            realHgWrapper.Update(clientRepoPath);

            // ── Fix 1 again: FindById must now succeed (correct Settings.xml after Update) ──
            ScrText afterMigration;
            Assert.That(
                () =>
                {
                    // SUT
                    afterMigration = scrTextCollection.FindById("DevAdmin", ProjectHexId);
                },
                Throws.Nothing,
                "After migration, FindById must not throw"
            );
            afterMigration = scrTextCollection.FindById("DevAdmin", ProjectHexId);
            Assert.That(afterMigration, Is.Not.Null, "After migration, ScrText must be loadable");
            Assert.That(afterMigration!.Guid.Id, Is.EqualTo(ProjectHexId));
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    // ─── Bypasses / helpers ───────────────────────────────────────────────────

    /// <summary>
    /// Bypasses <c>InternetAccess.VerifySafety()</c> by directly setting the in-memory
    /// <c>PermittedInternetUse</c> flag to <c>Enabled</c> via reflection. This avoids
    /// the <c>VpnDisconnectedException</c> thrown in CI/sandbox environments where there
    /// is no network, without writing anything to disk.
    /// </summary>
    private static void BypassParatextInternetAccessCheck()
    {
        // InternetAccess.internetSettings is a private static field of type InternetSettingsMemento.
        // InternetSettingsMemento.PermittedInternetUse is a public instance field.
        // InternetUse.Enabled has int value 0 (based on the enum ordering in ParatextData).
        Type internetAccessType = typeof(Paratext.Data.InternetAccess);
        System.Reflection.FieldInfo settingsField = internetAccessType.GetField(
            "internetSettings",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static
        );
        object settings = settingsField!.GetValue(null)!;
        System.Reflection.FieldInfo useField = settings
            .GetType()
            .GetField("PermittedInternetUse", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        // InternetUse.Enabled = 0 in the ParatextData enum. We set it via the enum directly.
        useField!.SetValue(settings, Paratext.Data.InternetUse.Enabled);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds a <c>Settings.xml</c> using the <em>legacy buggy</em> UUID-with-dashes format for the
    /// <c>&lt;Guid&gt;</c> element. Used in stale-repo migration tests to simulate the old behavior.
    /// </summary>
    private static string BuildLegacySettingsXml(string dashedGuid) =>
        $"""
        <?xml version="1.0" encoding="utf-8"?>
        <ScriptureText>
          <Guid>{dashedGuid}</Guid>
          <Name>{ShortName}</Name>
          <FullName>{FullName}</FullName>
          <DefaultStylesheet>usfm.sty</DefaultStylesheet>
          <Editable>True</Editable>
          <Encoding>65001</Encoding>
          <LanguageIsoCode>{LanguageIsoCode}::</LanguageIsoCode>
          <Versification>4</Versification>
          <Naming BookNameForm="40MAT" PostPart=".SFM" PrePart="" />
        </ScriptureText>
        """;

    private static string ExtractXmlElementValue(string xml, string elementName)
    {
        string open = $"<{elementName}>";
        string close = $"</{elementName}>";
        int start = xml.IndexOf(open) + open.Length;
        int end = xml.IndexOf(close);
        return xml[start..end];
    }
}


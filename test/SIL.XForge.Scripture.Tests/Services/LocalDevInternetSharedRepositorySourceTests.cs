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

    // ─── E2E integration test using real Mercurial ───────────────────────────

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

    private static string ExtractXmlElementValue(string xml, string elementName)
    {
        string open = $"<{elementName}>";
        string close = $"</{elementName}>";
        int start = xml.IndexOf(open) + open.Length;
        int end = xml.IndexOf(close);
        return xml[start..end];
    }
}


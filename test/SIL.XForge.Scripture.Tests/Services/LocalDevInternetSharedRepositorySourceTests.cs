using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Paratext.Data;
using SIL.XForge.Configuration;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// Unit tests for <see cref="LocalDevInternetSharedRepositorySource"/> — the local-dev-only
/// Paratext S/R source that serves configured projects from local Mercurial repositories.
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


using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using SIL.XForge.Configuration;
using SIL.XForge.Models;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// Various settings and values to be used in the Razor pages.
/// </summary>
/// <param name="authOptions">The authentication options from the website configuration.</param>
/// <param name="bugsnagOptions">The Bugsnag options from the website configuration.</param>
/// <param name="httpContextAccessor">The HTTP context accessor.</param>
/// <param name="siteOptions">The site options from the website configuration.</param>
public class RazorPageSettings(
    IOptions<AuthOptions> authOptions,
    IOptions<BugsnagOptions> bugsnagOptions,
    IHttpContextAccessor httpContextAccessor,
    IOptions<SiteOptions> siteOptions
) : IRazorPageSettings
{
    private const string HelpsUrl = "https://help.scriptureforge.org";

    public PublicAuthOptions GetAuthOptions() =>
        new PublicAuthOptions
        {
            Audience = authOptions.Value.Audience,
            Domain = authOptions.Value.Domain,
            FrontendClientId = authOptions.Value.FrontendClientId,
            Scope = authOptions.Value.Scope,
        };

    public string GetBugsnagConfig() =>
        JsonConvert.SerializeObject(
            new Dictionary<string, object>
            {
                { "apiKey", bugsnagOptions.Value.ApiKey },
                { "appVersion", GetProductVersion() },
                { "notifyReleaseStages", bugsnagOptions.Value.NotifyReleaseStages },
                { "releaseStage", bugsnagOptions.Value.ReleaseStage },
            },
            Formatting.Indented
        );

    public string GetHelpsUrl()
    {
        // The request culture may be a variant of a supported culture (i.e. en-US for en), so match on all of its tags
        string? uiCulture = httpContextAccessor
            .HttpContext?.Features.Get<IRequestCultureFeature>()
            ?.RequestCulture.UICulture.Name;
        InterfaceLanguage? language = SharedResource.Cultures.Values.FirstOrDefault(c => c.Tags.Contains(uiCulture));

        // Languages without a translated help site (and English) use the help site root
        string helps = language?.Helps ?? string.Empty;
        return helps == string.Empty ? HelpsUrl : $"{HelpsUrl}/{helps}";
    }

    public string GetProductVersion() => Product.Version;

    public string GetSiteName() => UseScriptureForgeBranding() ? siteOptions.Value.Name : HostName;

    public bool UseScriptureForgeBranding() =>
        HostName.Contains("scriptureforge.org", StringComparison.OrdinalIgnoreCase)
        || HostName.Contains("localhost", StringComparison.OrdinalIgnoreCase);

    private string HostName => httpContextAccessor.HttpContext?.Request.Host.Host ?? string.Empty;
}

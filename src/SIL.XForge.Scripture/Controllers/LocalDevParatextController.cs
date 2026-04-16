#nullable disable warnings
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json.Linq;
using SIL.XForge.Configuration;
using SIL.XForge.Services;

namespace SIL.XForge.Scripture.Controllers;

/// <summary>
/// Provides local-development-only Paratext registry endpoints that replace the real
/// <c>registry.paratext.org</c>. These endpoints handle the HTTP calls made by
/// <see cref="SIL.XForge.Scripture.Services.ParatextService"/> via its internal <c>HttpClient</c>, which
/// is redirected here via <see cref="ParatextOptions.LocalRegistryServerUri"/>.
///
/// Only active when <see cref="AuthOptions.UseLocalAuth"/> is <c>true</c>.
/// </summary>
[ApiController]
[AllowAnonymous]
public class LocalDevParatextController(
    LocalDevKeyProvider keyProvider,
    IOptions<AuthOptions> authOptions,
    IOptions<LocalDevParatextOptions> paratextConfig
) : ControllerBase
{
    // ─── Registry endpoints (/api8/…) ───────────────────────────────────────────

    /// <summary>
    /// Returns basic info about the authenticated Paratext user.
    /// Called by <c>ParatextService.CanUserAuthenticateToPTRegistryAsync()</c>.
    /// </summary>
    [HttpGet("/api8/userinfo")]
    public IActionResult UserInfo()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        string ptUsername = ExtractParatextUsername(Request.Headers.Authorization);
        return Ok(new { sub = ptUsername, username = ptUsername });
    }

    /// <summary>
    /// Returns a refreshed Paratext access token.
    /// Called by <c>JwtTokenHelper.RefreshAccessTokenAsync()</c> when the token is about to expire.
    /// </summary>
    [HttpPost("/api8/token")]
    public IActionResult RefreshToken([FromBody] JObject body)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        // Extract the Paratext username from the refresh token (format "dev-pt-refresh-{userId}").
        string refreshToken = (string)body?["refresh_token"] ?? string.Empty;
        string userId = refreshToken.StartsWith("dev-pt-refresh-", StringComparison.Ordinal)
            ? refreshToken["dev-pt-refresh-".Length..]
            : string.Empty;

        LocalDevUser user = LocalDevAuthService.DevUsers.FirstOrDefault(u => u.UserId == userId);
        string ptUsername = user?.ParatextUsername ?? "DevUser";

        string newAccessToken = GenerateParatextAccessToken(ptUsername);
        return Ok(
            new
            {
                access_token = newAccessToken,
                refresh_token = refreshToken,
                expires_in = 86400,
                token_type = "Bearer",
            }
        );
    }

    /// <summary>
    /// Returns all projects the current Paratext user is a member of.
    /// Called by <c>JwtInternetSharedRepositorySource.GetProjectsMetaData()</c>.
    /// </summary>
    [HttpGet("/api8/my/projects")]
    public IActionResult MyProjects()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        string ptUsername = ExtractParatextUsername(Request.Headers.Authorization);
        var projects = paratextConfig
            .Value.Projects.Where(p => p.UserRoles.ContainsKey(ptUsername))
            .Select(p => BuildProjectJson(p));
        return Content(new JArray(projects).ToString(), "application/json");
    }

    /// <summary>
    /// Returns the license list for all projects the current user belongs to.
    /// Called by <c>JwtInternetSharedRepositorySource.GetLicensesForUserProjects()</c>.
    /// </summary>
    [HttpGet("/api8/my/licenses")]
    public IActionResult MyLicenses()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        string ptUsername = ExtractParatextUsername(Request.Headers.Authorization);
        var licenses = paratextConfig
            .Value.Projects.Where(p => p.UserRoles.ContainsKey(ptUsername))
            .Select(p => BuildLicenseJson(p));
        return Content(new JArray(licenses).ToString(), "application/json");
    }

    /// <summary>
    /// Returns metadata for a specific Paratext project.
    /// Called by <c>JwtInternetSharedRepositorySource.GetProjectMetadata()</c>.
    /// </summary>
    [HttpGet("/api8/projects/{paratextId}")]
    public IActionResult ProjectMetadata(string paratextId)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        LocalDevParatextProject project = paratextConfig.Value.Projects.FirstOrDefault(p =>
            p.ParatextId == paratextId
        );
        if (project == null)
            return NotFound();

        return Content(BuildProjectJson(project).ToString(), "application/json");
    }

    /// <summary>
    /// Returns the license for a specific project.
    /// Called by <c>JwtInternetSharedRepositorySource.GetLicenseForUserProject()</c>.
    /// </summary>
    [HttpGet("/api8/projects/{paratextId}/license")]
    public IActionResult ProjectLicense(string paratextId)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        string ptUsername = ExtractParatextUsername(Request.Headers.Authorization);
        LocalDevParatextProject project = paratextConfig.Value.Projects.FirstOrDefault(p =>
            p.ParatextId == paratextId && p.UserRoles.ContainsKey(ptUsername)
        );
        if (project == null)
            return NotFound();

        return Content(BuildLicenseJson(project).ToString(), "application/json");
    }

    /// <summary>
    /// Returns the requesting user's role in a project.
    /// Called by <c>ParatextService.GetProjectRoleAsync()</c>.
    /// </summary>
    [HttpGet("/api8/projects/{paratextId}/members/{userId}")]
    public IActionResult ProjectMember(string paratextId, string userId)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        string ptUsername = ExtractParatextUsername(Request.Headers.Authorization);
        LocalDevParatextProject project = paratextConfig.Value.Projects.FirstOrDefault(p =>
            p.ParatextId == paratextId
        );
        if (project == null || !project.UserRoles.TryGetValue(ptUsername, out string role))
            return NotFound();

        return Ok(new { role });
    }

    /// <summary>
    /// Returns the Paratext project ID to confirm that the project is "registered".
    /// Called by <c>ParatextService.IsRegisteredAsync()</c>.
    /// </summary>
    [HttpGet("/api8/projects/{paratextId}/identification_systemId/paratext/text")]
    public IActionResult ProjectIdentification(string paratextId)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        bool exists = paratextConfig.Value.Projects.Any(p => p.ParatextId == paratextId);
        if (!exists)
            return NotFound();

        // The real registry returns the ID as a quoted JSON string.
        return Content($"\"{paratextId}\"", "application/json");
    }

    // ─── S/R server stub endpoints (/listrepos, /pullbundle, etc.) ──────────────
    // These are only hit when ParatextService uses its raw HttpClient or the Paratext.Data RESTClient
    // directly against the local server. With LocalDevInternetSharedRepositorySource the S/R operations
    // are handled in-process, so these endpoints act as a safety net.

    /// <summary>
    /// Lists available repositories. Called by
    /// <c>JwtInternetSharedRepositorySource.CanUserAuthenticateToPTArchives()</c> — but with the local
    /// source provider that method always returns true, so this endpoint is rarely reached.
    /// </summary>
    [HttpGet("/listrepos")]
    public IActionResult ListRepos()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();
        return Ok(Array.Empty<object>());
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Extracts the Paratext username from the <c>Authorization: Bearer …</c> header.
    /// Returns an empty string if the token is missing or cannot be parsed.
    /// </summary>
    private static string ExtractParatextUsername(Microsoft.Extensions.Primitives.StringValues authHeader)
    {
        string bearer = authHeader.ToString();
        if (!bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return string.Empty;

        string raw = bearer["Bearer ".Length..].Trim();
        try
        {
            var jwt = new JwtSecurityToken(raw);
            return jwt.Claims.FirstOrDefault(c => c.Type == "username")?.Value ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Generates a new Paratext access token signed with the local dev key.
    /// </summary>
    private string GenerateParatextAccessToken(string ptUsername)
    {
        var credentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
            keyProvider.SecurityKey,
            Microsoft.IdentityModel.Tokens.SecurityAlgorithms.RsaSha256
        );
        DateTime now = DateTime.UtcNow;
        var claims = new[]
        {
            new System.Security.Claims.Claim("username", ptUsername),
            new System.Security.Claims.Claim(JwtRegisteredClaimNames.Sub, ptUsername),
            new System.Security.Claims.Claim(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                System.Security.Claims.ClaimValueTypes.Integer64
            ),
        };
        var token = new JwtSecurityToken(
            issuer: "dev-paratext",
            audience: "dev-paratext",
            claims: claims,
            notBefore: now,
            expires: now.AddHours(24),
            signingCredentials: credentials
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static JObject BuildProjectJson(LocalDevParatextProject project) =>
        JObject.Parse(
            $$$"""
            {
              "identification_name": "{{{project.FullName}}}",
              "identification_systemId": [{"type": "paratext", "text": "{{{project.ParatextId}}}"}],
              "language_iso": "{{{project.LanguageIsoCode}}}"
            }
            """
        );

    private static JObject BuildLicenseJson(LocalDevParatextProject project) =>
        JObject.Parse(
            $$$"""
            {
              "type": "translator",
              "licensedToParatextId": "{{{project.ParatextId}}}",
              "licensedToOrgs": [],
              "issuedAt": "{{{DateTime.UtcNow:o}}}",
              "expiresAt": "{{{DateTime.UtcNow.AddYears(10):o}}}",
              "revoked": false
            }
            """
        );
}

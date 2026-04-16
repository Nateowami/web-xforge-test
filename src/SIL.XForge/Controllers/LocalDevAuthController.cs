#nullable disable warnings
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using Duende.IdentityModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SIL.XForge.Configuration;
using SIL.XForge.Services;
using SIL.XForge.Utils;

namespace SIL.XForge.Controllers;

/// <summary>
/// Provides local-development-only authentication endpoints that replace Auth0.
/// These endpoints issue JWT tokens for pre-defined test users without requiring any external
/// authentication service. This controller is only registered when
/// <see cref="AuthOptions.UseLocalAuth"/> is true.
/// </summary>
[ApiController]
[AllowAnonymous]
public class LocalDevAuthController(LocalDevKeyProvider keyProvider, IOptions<AuthOptions> authOptions) : ControllerBase
{
    /// <summary>
    /// Returns the list of available local dev users.
    /// This is fetched by the local auth login page to display the user selection.
    /// </summary>
    [HttpGet("/dev-auth/users")]
    public IActionResult Users()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();
        return Ok(
            LocalDevAuthService.DevUsers.Select(u => new
            {
                userId = u.UserId,
                name = u.Name,
                email = u.Email,
                roles = u.Roles,
            })
        );
    }

    /// <summary>
    /// Issues access and ID tokens for a local dev user.
    /// </summary>
    /// <remarks>
    /// POST /dev-auth/token
    /// Body: { "userId": "devUser01" }
    /// </remarks>
    [HttpPost("/dev-auth/token")]
    public IActionResult Token([FromBody] LocalDevTokenRequest request)
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();

        LocalDevUser user =
            LocalDevAuthService.DevUsers.FirstOrDefault(u => u.UserId == request.UserId)
            ?? LocalDevAuthService.DevUsers[0];

        string issuer = GetIssuer();
        var credentials = new SigningCredentials(keyProvider.SecurityKey, SecurityAlgorithms.RsaSha256);
        int expiresInSeconds = 24 * 60 * 60; // 24 hours
        DateTime now = DateTime.UtcNow;
        DateTime expiry = now.AddSeconds(expiresInSeconds);

        // Build access token with XForge custom claims
        var accessTokenClaims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, $"dev|{user.UserId}"),
            new Claim(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64
            ),
            new Claim(JwtClaimTypes.Scope, $"openid profile email {authOptions.Value.Scope} offline_access"),
            new Claim(XFClaimTypes.UserId, user.UserId),
        }
            .Concat(user.Roles.Select(r => new Claim(XFClaimTypes.Role, r)))
            .ToArray();

        var accessToken = new JwtSecurityToken(
            issuer: issuer,
            audience: authOptions.Value.Audience,
            claims: accessTokenClaims,
            notBefore: now,
            expires: expiry,
            signingCredentials: credentials
        );

        // Build ID token with profile claims
        var idTokenClaims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, $"dev|{user.UserId}"),
            new Claim(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64
            ),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.Name),
            new Claim("picture", ""),
            new Claim(XFClaimTypes.UserId, user.UserId),
        }
            .Concat(user.Roles.Select(r => new Claim(XFClaimTypes.Role, r)))
            .ToArray();

        var idToken = new JwtSecurityToken(
            issuer: issuer,
            audience: authOptions.Value.FrontendClientId,
            claims: idTokenClaims,
            notBefore: now,
            expires: expiry,
            signingCredentials: credentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        return Ok(
            new
            {
                access_token = tokenHandler.WriteToken(accessToken),
                id_token = tokenHandler.WriteToken(idToken),
                expires_in = expiresInSeconds,
                token_type = "Bearer",
            }
        );
    }

    /// <summary>
    /// Returns the JWKS (JSON Web Key Set) containing the local dev public key.
    /// This is fetched by the backend JWT Bearer middleware and the RealtimeServer to validate tokens.
    /// </summary>
    [HttpGet("/.well-known/jwks.json")]
    public IActionResult Jwks()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();
        return Content(keyProvider.GetJwksJson(), "application/json");
    }

    /// <summary>
    /// Returns the OIDC discovery document for the local dev auth server.
    /// </summary>
    [HttpGet("/.well-known/openid-configuration")]
    public IActionResult OpenIdConfiguration()
    {
        if (!authOptions.Value.UseLocalAuth)
            return NotFound();
        string issuer = GetIssuer();
        return Ok(
            new
            {
                issuer,
                jwks_uri = $"{issuer}.well-known/jwks.json",
                response_types_supported = new[] { "code" },
                subject_types_supported = new[] { "public" },
                id_token_signing_alg_values_supported = new[] { "RS256" },
            }
        );
    }

    private string GetIssuer() =>
        // Use the request's scheme and host as the issuer so it works regardless of port
        $"{Request.Scheme}://{Request.Host}/";
}

/// <summary>
/// Request body for the local dev token endpoint.
/// </summary>
public class LocalDevTokenRequest
{
    /// <summary>
    /// The ID of the local dev user to issue tokens for. Defaults to the first dev user if not found.
    /// </summary>
    public string UserId { get; set; } = string.Empty;
}

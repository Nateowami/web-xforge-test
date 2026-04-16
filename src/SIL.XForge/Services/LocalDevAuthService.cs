using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;
using SIL.XForge.Models;

namespace SIL.XForge.Services;

/// <summary>
/// Represents a pre-defined test user for local development authentication.
/// Instances of this class are created in <see cref="LocalDevAuthService.DevUsers"/> and are used to
/// issue mock JWT tokens and Auth0-style user profiles without any external Auth0 dependency.
/// </summary>
public class LocalDevUser
{
    public string UserId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string[] Roles { get; init; } = [];

    /// <summary>
    /// The Paratext username for this dev user. When set, a mock Paratext identity is included in the user
    /// profile returned by <see cref="LocalDevAuthService.GetUserAsync"/>, which allows the SF backend to
    /// automatically populate <c>UserSecret.ParatextTokens</c> on login without requiring a real Paratext
    /// account or Auth0 Paratext connection.
    /// </summary>
    public string? ParatextUsername { get; init; }
}

/// <summary>
/// Mock implementation of <see cref="IAuthService"/> used in local development mode.
/// Returns mock Auth0-style user profiles instead of calling the real Auth0 Management API.
/// This allows development to work entirely offline without an Auth0 account.
/// </summary>
public class LocalDevAuthService : IAuthService
{
    /// <summary>
    /// The set of pre-defined test users available for local development login.
    /// </summary>
    public static readonly IReadOnlyList<LocalDevUser> DevUsers =
    [
        new LocalDevUser
        {
            UserId = "devUser01",
            Name = "Dev Admin",
            Email = "devadmin@localhost",
            Roles = [SystemRole.SystemAdmin],
            ParatextUsername = "DevAdmin",
        },
        new LocalDevUser
        {
            UserId = "devUser02",
            Name = "Dev User",
            Email = "devuser@localhost",
            Roles = [],
            ParatextUsername = "DevUser",
        },
    ];

    private readonly LocalDevKeyProvider _keyProvider;

    public LocalDevAuthService(LocalDevKeyProvider keyProvider) => _keyProvider = keyProvider;

    public bool ValidateWebhookCredentials(string username, string password) => false;

    /// <summary>
    /// Returns mock Paratext access and refresh tokens for the given auth ID, if the dev user has a
    /// <see cref="LocalDevUser.ParatextUsername"/>. The access token is a JWT signed with the local dev
    /// key and contains the <c>username</c> claim expected by <see cref="SIL.XForge.Scripture.Services.JwtTokenHelper"/>.
    /// </summary>
    public Task<Tokens?> GetParatextTokensAsync(string authId, CancellationToken token)
    {
        string userId = authId.StartsWith("dev|", StringComparison.Ordinal) ? authId["dev|".Length..] : authId;
        LocalDevUser? user = DevUsers.FirstOrDefault(u => u.UserId == userId);
        if (user?.ParatextUsername == null)
            return Task.FromResult<Tokens?>(null);

        string accessToken = GenerateParatextAccessToken(user.ParatextUsername);
        return Task.FromResult<Tokens?>(
            new Tokens { AccessToken = accessToken, RefreshToken = $"dev-pt-refresh-{user.UserId}" }
        );
    }

    /// <summary>
    /// Returns a mock Auth0-style user profile JSON for the given auth ID.
    /// The <paramref name="authId"/> is expected to be in the format <c>dev|{userId}</c>.
    /// When the dev user has a <see cref="LocalDevUser.ParatextUsername"/>, a mock Paratext identity is
    /// included so that <c>UserService.pullAuthUserProfile</c> automatically populates
    /// <c>UserSecret.ParatextTokens</c> on first login.
    /// </summary>
    public Task<string> GetUserAsync(string authId)
    {
        string userId = authId.StartsWith("dev|", StringComparison.Ordinal) ? authId["dev|".Length..] : authId;

        LocalDevUser user = DevUsers.FirstOrDefault(u => u.UserId == userId) ?? DevUsers[0];

        var identities = new JArray(
            new JObject(
                new JProperty("connection", "Username-Password-Authentication"),
                new JProperty("user_id", user.UserId),
                new JProperty("provider", "auth0"),
                new JProperty("isSocial", false)
            )
        );

        // When the dev user has a Paratext username, include a mock paratext identity with tokens.
        // UserService.pullAuthUserProfile reads this to populate UserSecret.ParatextTokens so that
        // Paratext operations work without a real Paratext account.
        if (user.ParatextUsername != null)
        {
            string ptAccessToken = GenerateParatextAccessToken(user.ParatextUsername);
            identities.Add(
                new JObject(
                    new JProperty("connection", "paratext"),
                    // Auth0 stores the Paratext numeric user ID as "oauth2|{id}".
                    // UserService.GetIdpIdFromAuthId splits on '|' and takes index 1,
                    // so this must be in the "provider|id" format.
                    new JProperty("user_id", $"oauth2|{user.ParatextUsername}"),
                    new JProperty("provider", "oauth2"),
                    new JProperty("isSocial", true),
                    new JProperty("access_token", ptAccessToken),
                    new JProperty("refresh_token", $"dev-pt-refresh-{user.UserId}")
                )
            );
        }

        var profile = new JObject(
            new JProperty("user_id", $"dev|{user.UserId}"),
            new JProperty("name", user.Name),
            new JProperty("nickname", user.UserId),
            new JProperty("email", user.Email),
            new JProperty("picture", ""),
            new JProperty("identities", identities),
            new JProperty(
                "app_metadata",
                new JObject(
                    new JProperty("xf_role", new JArray(user.Roles.Cast<object>().ToArray())),
                    new JProperty("xf_user_id", user.UserId)
                )
            ),
            new JProperty("user_metadata", new JObject(new JProperty("interface_language", "en")))
        );

        return Task.FromResult(profile.ToString());
    }

    /// <summary>
    /// Not supported in local dev mode. Transparent authentication (share-key flow) requires Auth0.
    /// </summary>
    public Task<string> GenerateAnonymousUser(
        string name,
        TransparentAuthenticationCredentials credentials,
        string language
    ) => throw new NotSupportedException("Anonymous user generation is not supported in local development mode.");

    /// <summary>
    /// Not supported in local dev mode. Paratext account linking requires Auth0.
    /// </summary>
    public Task LinkAccounts(string primaryAuthId, string secondaryAuthId) =>
        throw new NotSupportedException("Account linking is not supported in local development mode.");

    /// <summary>
    /// No-op in local dev mode.
    /// </summary>
    public Task UpdateAvatar(string authId, string url) => Task.CompletedTask;

    /// <summary>
    /// No-op in local dev mode.
    /// </summary>
    public Task UpdateInterfaceLanguage(string authId, string language) => Task.CompletedTask;

    /// <summary>
    /// Generates a Paratext-compatible JWT access token for a dev user. The token contains the
    /// <c>username</c> claim required by <see cref="SIL.XForge.Scripture.Services.JwtTokenHelper.GetParatextUsername"/>.
    /// The token is signed with the same local RSA key used for SF auth tokens.
    /// </summary>
    private string GenerateParatextAccessToken(string ptUsername)
    {
        var credentials = new SigningCredentials(_keyProvider.SecurityKey, SecurityAlgorithms.RsaSha256);
        DateTime now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim("username", ptUsername),
            new Claim(JwtRegisteredClaimNames.Sub, ptUsername),
            new Claim(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64
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
}

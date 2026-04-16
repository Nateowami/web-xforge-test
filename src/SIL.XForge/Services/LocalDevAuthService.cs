using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using SIL.XForge.Models;

namespace SIL.XForge.Services;

/// <summary>
/// Provides a pre-defined set of dev users for local development authentication.
/// </summary>
public class LocalDevUser
{
    public string UserId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string[] Roles { get; init; } = [];
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
        },
        new LocalDevUser
        {
            UserId = "devUser02",
            Name = "Dev User",
            Email = "devuser@localhost",
            Roles = [],
        },
    ];

    public bool ValidateWebhookCredentials(string username, string password) => false;

    public Task<Tokens?> GetParatextTokensAsync(string authId, CancellationToken token) =>
        Task.FromResult<Tokens?>(null);

    /// <summary>
    /// Returns a mock Auth0-style user profile JSON for the given auth ID.
    /// The <paramref name="authId"/> is expected to be in the format <c>dev|{userId}</c>.
    /// </summary>
    public Task<string> GetUserAsync(string authId)
    {
        string userId = authId.StartsWith("dev|", StringComparison.Ordinal) ? authId["dev|".Length..] : authId;

        LocalDevUser user = DevUsers.FirstOrDefault(u => u.UserId == userId) ?? DevUsers[0];

        var profile = new JObject(
            new JProperty("user_id", $"dev|{user.UserId}"),
            new JProperty("name", user.Name),
            new JProperty("nickname", user.UserId),
            new JProperty("email", user.Email),
            new JProperty("picture", ""),
            new JProperty(
                "identities",
                new JArray(
                    new JObject(
                        new JProperty("connection", "Username-Password-Authentication"),
                        new JProperty("user_id", user.UserId),
                        new JProperty("provider", "auth0"),
                        new JProperty("isSocial", false)
                    )
                )
            ),
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
}

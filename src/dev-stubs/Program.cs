// Local-development stub server replacing Auth0 and the Paratext Registry/Send-Receive server.
// Run this alongside the main Scripture Forge app when UseLocalAuth = true.
// Configure the main app's appsettings.Development.json with:
//   "Auth": { "Domain": "localhost:5050" }
//   "Paratext": { "LocalRegistryServerUri": "http://localhost:5050" }
#pragma warning disable CS8604 // ignore possible null reference warnings in startup code

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;

var builder = WebApplication.CreateBuilder(args);

// Allow CORS from the main application so the frontend (served on 5000/5001) can
// call /dev-auth/users and /dev-auth/token directly.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost:5000", "https://localhost:5001", "http://127.0.0.1:5000")
            .AllowAnyHeader()
            .AllowAnyMethod()
    )
);

var app = builder.Build();
app.UseCors();

// ─── Key material ────────────────────────────────────────────────────────────

// Load the fixed dev private key from config.  Using a fixed key means the main
// app never has to re-fetch the public key when the stub restarts, and it removes
// any timing dependency between the two processes.
string privateKeyPem =
    app.Configuration["Auth:LocalDevPrivateKeyPem"]
    ?? throw new InvalidOperationException(
        "Auth:LocalDevPrivateKeyPem is not configured in dev-stubs appsettings.json"
    );
using var rsa = RSA.Create();
rsa.ImportFromPem(privateKeyPem);
var securityKey = new RsaSecurityKey(rsa) { KeyId = "dev-stub-key" };
var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256);

// ─── Configuration ────────────────────────────────────────────────────────────

string issuer = app.Configuration["Auth:Issuer"] ?? "http://localhost:5050/";
string audience = app.Configuration["Auth:Audience"] ?? "https://scriptureforge.org/";
string scope = app.Configuration["Auth:Scope"] ?? "sf_data";
string clientId = app.Configuration["Auth:FrontendClientId"] ?? "local-dev-client";

/// <summary>Pre-defined local dev users exposed by the stub.</summary>
var devUsers = new[]
{
    new DevUser(
        UserId: "devUser01",
        Name: "Dev Admin",
        Email: "devadmin@localhost",
        Roles: ["system_admin"],
        ParatextUsername: "DevAdmin"
    ),
    new DevUser(
        UserId: "devUser02",
        Name: "Dev User",
        Email: "devuser@localhost",
        Roles: [],
        ParatextUsername: "DevUser"
    ),
};

// Read project list from appsettings.json  LocalDevParatext:Projects
var projectsSection = app.Configuration.GetSection("LocalDevParatext:Projects");
var devProjects = projectsSection.Get<DevProject[]>() ?? [];

// ─── OIDC discovery ──────────────────────────────────────────────────────────

/// <summary>
/// Returns the OpenID Connect discovery document.
/// Fetched by the main app's JWT Bearer middleware and the RealtimeServer to locate the JWKS URI.
/// </summary>
app.MapGet(
    "/.well-known/openid-configuration",
    () =>
        Results.Ok(
            new
            {
                issuer,
                jwks_uri = $"{issuer}.well-known/jwks.json",
                response_types_supported = new[] { "code" },
                subject_types_supported = new[] { "public" },
                id_token_signing_alg_values_supported = new[] { "RS256" },
            }
        )
);

/// <summary>
/// Returns the JSON Web Key Set containing the stub's public signing key.
/// Used by the main app and RealtimeServer to validate JWT signatures.
/// </summary>
app.MapGet(
    "/.well-known/jwks.json",
    () =>
    {
        var jsonWebKey = JsonWebKeyConverter.ConvertFromRSASecurityKey(securityKey);
        jsonWebKey.Alg = SecurityAlgorithms.RsaSha256;
        jsonWebKey.Use = JsonWebKeyUseNames.Sig;
        var keyObject = new JObject(
            new JProperty("kty", jsonWebKey.Kty),
            new JProperty("kid", jsonWebKey.Kid),
            new JProperty("use", jsonWebKey.Use),
            new JProperty("alg", jsonWebKey.Alg),
            new JProperty("n", jsonWebKey.N),
            new JProperty("e", jsonWebKey.E)
        );
        string jwks = new JObject(new JProperty("keys", new JArray(keyObject))).ToString();
        return Results.Content(jwks, "application/json");
    }
);

// ─── Auth0-replacement endpoints ─────────────────────────────────────────────

/// <summary>
/// Serves the standalone HTML login page for local development.
/// The Angular app's LocalAuth0Client redirects here via a full-page navigation when login is
/// required, so the login UI lives entirely in the stub rather than in the Angular app.
/// After the user selects a dev user, the page issues a token and redirects back to the
/// <c>redirect_uri</c> (normally <c>http://localhost:5000/callback/auth0</c>) with the token
/// embedded as a URL fragment so no cross-origin localStorage writes are needed.
/// </summary>
app.MapGet(
    "/login",
    (HttpRequest request) =>
    {
        string redirectUri = request.Query["redirect_uri"].FirstOrDefault() ?? "/";
        string html = $$"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Dev Login – Scripture Forge</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Roboto, sans-serif; background: #f5f5f5;
                   display: flex; justify-content: center; align-items: center;
                   min-height: 100vh; padding: 16px; }
            .card { background: #fff; border-radius: 8px; padding: 32px;
                    max-width: 480px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
            h1 { font-size: 1.4rem; margin-bottom: 8px; }
            .subtitle { color: #555; margin-bottom: 24px; font-size: .9rem; }
            .error { color: #c62828; background: #ffebee; border-radius: 4px;
                     padding: 10px 14px; margin-bottom: 16px; font-size: .9rem; display: none; }
            .user-row { display: flex; align-items: center; justify-content: space-between;
                        gap: 16px; padding: 12px; border: 1px solid #e0e0e0;
                        border-radius: 4px; margin-bottom: 10px; }
            .user-info .name { font-weight: 500; }
            .user-info .email,
            .user-info .roles { font-size: .82rem; color: #666; }
            button { background: #1976d2; color: #fff; border: none; border-radius: 4px;
                     padding: 8px 16px; font-size: .9rem; cursor: pointer;
                     white-space: nowrap; }
            button:hover { background: #1565c0; }
            button:disabled { background: #90caf9; cursor: not-allowed; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Local Development Login</h1>
            <p class="subtitle">Select a test user to log in as. This page is only available in local development mode.</p>
            <div id="error" class="error"></div>
            <div id="users"></div>
          </div>
          <script>
            const redirectUri = {{(System.Text.Json.JsonSerializer.Serialize(redirectUri))}};
            function showError(msg) {
              const el = document.getElementById('error');
              el.textContent = msg;
              el.style.display = 'block';
            }
            async function loginAs(userId, btn) {
              btn.disabled = true;
              document.getElementById('error').style.display = 'none';
              try {
                const resp = await fetch('/dev-auth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId })
                });
                if (!resp.ok) throw new Error('Token endpoint returned ' + resp.status);
                const token = await resp.json();
                const params = new URLSearchParams({
                  access_token: token.access_token,
                  id_token:     token.id_token,
                  expires_in:   String(token.expires_in),
                  token_type:   'Bearer'
                });
                window.location.href = redirectUri + '#' + params.toString();
              } catch (err) {
                showError('Login failed: ' + err.message);
                btn.disabled = false;
              }
            }
            fetch('/dev-auth/users')
              .then(r => r.json())
              .then(users => {
                const container = document.getElementById('users');
                users.forEach(u => {
                  const row = document.createElement('div');
                  row.className = 'user-row';
                  const info = document.createElement('div');
                  info.className = 'user-info';
                  info.innerHTML =
                    '<div class="name">' + u.name + '</div>' +
                    '<div class="email">' + u.email + '</div>' +
                    (u.roles.length ? '<div class="roles">Roles: ' + u.roles.join(', ') + '</div>' : '');
                  const btn = document.createElement('button');
                  btn.textContent = 'Log in as ' + u.name;
                  btn.onclick = () => loginAs(u.userId, btn);
                  row.appendChild(info);
                  row.appendChild(btn);
                  container.appendChild(row);
                });
              })
              .catch(() => showError('Could not load user list from stub server.'));
          </script>
        </body>
        </html>
        """;
        return Results.Content(html, "text/html; charset=utf-8");
    }
);

/// <summary>
/// Returns the list of pre-defined dev users.
/// Fetched by the stub's own login HTML page (same-origin, no CORS needed).
/// </summary>
app.MapGet(
    "/dev-auth/users",
    () =>
        Results.Ok(
            devUsers.Select(u => new
            {
                userId = u.UserId,
                name = u.Name,
                email = u.Email,
                roles = u.Roles,
            })
        )
);

/// <summary>
/// Issues an SF access token and ID token for the requested dev user.
/// Called by the stub's own login HTML page when the user clicks "Log in as…".
/// </summary>
app.MapPost(
    "/dev-auth/token",
    (LocalDevTokenRequest request) =>
    {
        DevUser user = devUsers.FirstOrDefault(u => u.UserId == request.UserId) ?? devUsers[0];

        int expiresInSeconds = 24 * 60 * 60;
        DateTime now = DateTime.UtcNow;
        DateTime expiry = now.AddSeconds(expiresInSeconds);

        // Access token carries the XF user ID and role claims used by the backend
        var accessTokenClaims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, $"dev|{user.UserId}"),
            new Claim(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64
            ),
            new Claim("scope", $"openid profile email {scope} offline_access"),
            new Claim("http://xforge.org/userid", user.UserId),
        }
            .Concat(user.Roles.Select(r => new Claim("http://xforge.org/role", r)))
            .ToArray();

        var accessToken = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: accessTokenClaims,
            notBefore: now,
            expires: expiry,
            signingCredentials: signingCredentials
        );

        // ID token carries profile claims used by the frontend
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
            new Claim("http://xforge.org/userid", user.UserId),
        }
            .Concat(user.Roles.Select(r => new Claim("http://xforge.org/role", r)))
            .ToArray();

        var idToken = new JwtSecurityToken(
            issuer: issuer,
            audience: clientId,
            claims: idTokenClaims,
            notBefore: now,
            expires: expiry,
            signingCredentials: signingCredentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        return Results.Ok(
            new
            {
                access_token = tokenHandler.WriteToken(accessToken),
                id_token = tokenHandler.WriteToken(idToken),
                expires_in = expiresInSeconds,
                token_type = "Bearer",
            }
        );
    }
);

// ─── Paratext Registry endpoints (/api8/…) ────────────────────────────────────

/// <summary>
/// Returns basic info about the authenticated Paratext user.
/// Called by ParatextService.CanUserAuthenticateToPTRegistryAsync().
/// </summary>
app.MapGet(
    "/api8/userinfo",
    (HttpRequest request) =>
    {
        string ptUsername = ExtractParatextUsername(request);
        return Results.Ok(new { sub = ptUsername, username = ptUsername });
    }
);

/// <summary>
/// Returns a refreshed Paratext access token.
/// Called by JwtTokenHelper.RefreshAccessTokenAsync() when the stored token is about to expire.
/// </summary>
app.MapPost(
    "/api8/token",
    (HttpRequest request) =>
    {
        using var reader = new StreamReader(request.Body);
        string body = reader.ReadToEndAsync().GetAwaiter().GetResult();
        var bodyObj = JObject.Parse(body);
        string refreshToken = (string?)bodyObj["refresh_token"] ?? string.Empty;
        string userId = refreshToken.StartsWith("dev-pt-refresh-", StringComparison.Ordinal)
            ? refreshToken["dev-pt-refresh-".Length..]
            : string.Empty;
        DevUser? user = devUsers.FirstOrDefault(u => u.UserId == userId);
        string ptUsername = user?.ParatextUsername ?? "DevUser";
        string newAccessToken = GenerateParatextAccessToken(ptUsername);
        return Results.Ok(
            new
            {
                access_token = newAccessToken,
                refresh_token = refreshToken,
                expires_in = 86400,
                token_type = "Bearer",
            }
        );
    }
);

/// <summary>
/// Returns all projects the current Paratext user is a member of.
/// Called by JwtInternetSharedRepositorySource.GetProjectsMetaData().
/// </summary>
app.MapGet(
    "/api8/my/projects",
    (HttpRequest request) =>
    {
        string ptUsername = ExtractParatextUsername(request);
        var projects = devProjects.Where(p => p.UserRoles.ContainsKey(ptUsername)).Select(p => BuildProjectJson(p));
        return Results.Content(new JArray(projects).ToString(), "application/json");
    }
);

/// <summary>
/// Returns the licenses for projects the current Paratext user belongs to.
/// Called by JwtInternetSharedRepositorySource.GetLicensesForUserProjects().
/// </summary>
app.MapGet(
    "/api8/my/licenses",
    (HttpRequest request) =>
    {
        string ptUsername = ExtractParatextUsername(request);
        var licenses = devProjects.Where(p => p.UserRoles.ContainsKey(ptUsername)).Select(p => BuildLicenseJson(p));
        return Results.Content(new JArray(licenses).ToString(), "application/json");
    }
);

/// <summary>
/// Returns metadata for a specific Paratext project.
/// Called by JwtInternetSharedRepositorySource.GetProjectMetadata().
/// </summary>
app.MapGet(
    "/api8/projects/{paratextId}",
    (string paratextId) =>
    {
        DevProject? project = devProjects.FirstOrDefault(p => p.ParatextId == paratextId);
        if (project == null)
            return Results.NotFound();
        return Results.Content(BuildProjectJson(project).ToString(), "application/json");
    }
);

/// <summary>
/// Returns the license for a specific Paratext project.
/// Called by JwtInternetSharedRepositorySource.GetLicenseForUserProject().
/// </summary>
app.MapGet(
    "/api8/projects/{paratextId}/license",
    (string paratextId, HttpRequest request) =>
    {
        string ptUsername = ExtractParatextUsername(request);
        DevProject? project = devProjects.FirstOrDefault(p =>
            p.ParatextId == paratextId && p.UserRoles.ContainsKey(ptUsername)
        );
        if (project == null)
            return Results.NotFound();
        return Results.Content(BuildLicenseJson(project).ToString(), "application/json");
    }
);

/// <summary>
/// Returns all members of a Paratext project with their roles and usernames.
/// Called by ParatextService.GetProjectMembersAsync() when syncing project members.
/// </summary>
app.MapGet(
    "/api8/projects/{paratextId}/members",
    (string paratextId) =>
    {
        DevProject? project = devProjects.FirstOrDefault(p => p.ParatextId == paratextId);
        if (project == null)
            return Results.NotFound();

        var members = project.UserRoles.Select(kv => new JObject(
            new JProperty("userId", kv.Key),
            new JProperty("username", kv.Key),
            new JProperty("role", kv.Value)
        ));
        return Results.Content(new JArray(members).ToString(), "application/json");
    }
);

/// <summary>
/// Returns the requesting user's role in a project.
/// Called by ParatextService.TryGetProjectRoleAsync().
/// </summary>
app.MapGet(
    "/api8/projects/{paratextId}/members/{userId}",
    (string paratextId, string userId, HttpRequest request) =>
    {
        string ptUsername = ExtractParatextUsername(request);
        DevProject? project = devProjects.FirstOrDefault(p => p.ParatextId == paratextId);
        if (project == null || !project.UserRoles.TryGetValue(ptUsername, out string? role))
            return Results.NotFound();
        return Results.Ok(new { role });
    }
);

/// <summary>
/// Confirms that a project is registered by returning its Paratext ID.
/// Called by ParatextService.IsRegisteredAsync().
/// </summary>
app.MapGet(
    "/api8/projects/{paratextId}/identification_systemId/paratext/text",
    (string paratextId) =>
    {
        bool exists = devProjects.Any(p => p.ParatextId == paratextId);
        if (!exists)
            return Results.NotFound();
        // The real registry returns the ID as a quoted JSON string.
        return Results.Content($"\"{paratextId}\"", "application/json");
    }
);

/// <summary>
/// Stub for the Send/Receive listrepos endpoint.
/// With LocalDevInternetSharedRepositorySource the S/R operations are in-process so this
/// endpoint acts only as a fallback.
/// </summary>
app.MapGet("/listrepos", () => Results.Ok(Array.Empty<object>()));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// <summary>
/// Extracts the Paratext username from the Authorization: Bearer … header.
/// Returns an empty string if the token cannot be read.
/// </summary>
string ExtractParatextUsername(HttpRequest request)
{
    string bearer = request.Headers.Authorization.ToString();
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
/// Generates a short-lived Paratext access token carrying the Paratext username claim.
/// The main app reads only the username claim and does not validate the signature.
/// </summary>
string GenerateParatextAccessToken(string ptUsername)
{
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
        signingCredentials: signingCredentials
    );
    return new JwtSecurityTokenHandler().WriteToken(token);
}

JObject BuildProjectJson(DevProject project) =>
    JObject.Parse(
        $$"""
        {
          "identification_name": "{{project.FullName}}",
          "identification_systemId": [{"type": "paratext", "text": "{{project.ParatextId}}"}],
          "language_iso": "{{project.LanguageIsoCode}}"
        }
        """
    );

JObject BuildLicenseJson(DevProject project) =>
    JObject.Parse(
        $$"""
        {
          "type": "translator",
          "licensedToParatextId": "{{project.ParatextId}}",
          "licensedToOrgs": [],
          "issuedAt": "{{DateTime.UtcNow:o}}",
          "expiresAt": "{{DateTime.UtcNow.AddYears(10):o}}",
          "revoked": false
        }
        """
    );

app.Run();

// ─── Request / config types ───────────────────────────────────────────────────

/// <summary>Request body for POST /dev-auth/token.</summary>
record LocalDevTokenRequest(string UserId);

/// <summary>A pre-defined local development user.</summary>
record DevUser(string UserId, string Name, string Email, string[] Roles, string ParatextUsername);

/// <summary>A Paratext project exposed by the local dev stub.</summary>
class DevProject
{
    /// <summary>The 32-character hex Paratext project ID.</summary>
    public string ParatextId { get; set; } = string.Empty;

    /// <summary>Short project name (e.g. "MAT").</summary>
    public string ShortName { get; set; } = string.Empty;

    /// <summary>Full display name of the project.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>BCP-47 language code for the project language.</summary>
    public string LanguageIsoCode { get; set; } = string.Empty;

    /// <summary>Map from Paratext username to role string (e.g. "pt_administrator").</summary>
    public Dictionary<string, string> UserRoles { get; set; } = new();
}

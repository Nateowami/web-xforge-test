// Local-development stub server replacing Auth0 and the Paratext Registry/Send-Receive server.
// Run this alongside the main Scripture Forge app when UseLocalAuth = true.
// Configure the main app's appsettings.Development.json with:
//   "Auth": { "Domain": "localhost:5050" }
//   "Paratext": { "LocalRegistryServerUri": "http://localhost:5050" }
#pragma warning disable CS8604 // ignore possible null reference warnings in startup code

using System.IdentityModel.Tokens.Jwt;
using System.IO.Compression;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Xml.Linq;
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
var devUsers = new List<DevUser>
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
/// Serves the admin management dashboard for the dev stub server.
/// Allows creating, viewing, editing, and deleting dev users, and viewing
/// configured Paratext projects and DBL resources.
/// </summary>
app.MapGet(
    "/admin",
    () =>
    {
        string html =
            """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Dev Stubs Admin</title>
              <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: Roboto, sans-serif; background: #f5f5f5; color: #212121; }
                header { background: #1565c0; color: #fff; padding: 12px 24px; }
                header h1 { font-size: 1.25rem; font-weight: 500; }
                nav { background: #fff; border-bottom: 1px solid #e0e0e0; display: flex; }
                nav button { background: none; border: none; border-bottom: 3px solid transparent;
                             padding: 12px 24px; font-size: .9rem; cursor: pointer; color: #555; }
                nav button.active { border-bottom-color: #1976d2; color: #1976d2; font-weight: 500; }
                nav button:hover:not(.active) { background: #f5f5f5; }
                main { max-width: 960px; margin: 24px auto; padding: 0 16px; }
                section { display: none; }
                section.visible { display: block; }
                h2 { font-size: 1rem; font-weight: 600; margin-bottom: 14px; color: #424242; }
                .card { background: #fff; border-radius: 6px; padding: 20px;
                        box-shadow: 0 1px 3px rgba(0,0,0,.12); margin-bottom: 20px; }
                form { display: grid; gap: 10px; }
                label { font-size: .83rem; color: #555; display: block; margin-bottom: 3px; }
                input { width: 100%; padding: 7px 10px; border: 1px solid #ccc;
                        border-radius: 4px; font-size: .9rem; }
                input:focus { outline: none; border-color: #1976d2; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .form-actions { display: flex; gap: 8px; margin-top: 4px; }
                .btn { border: none; border-radius: 4px; padding: 8px 16px;
                       font-size: .88rem; cursor: pointer; }
                .btn-primary { background: #1976d2; color: #fff; }
                .btn-primary:hover { background: #1565c0; }
                .btn-secondary { background: #e0e0e0; color: #212121; }
                .btn-secondary:hover { background: #bdbdbd; }
                .btn-danger { background: #d32f2f; color: #fff; }
                .btn-danger:hover { background: #b71c1c; }
                .btn-sm { padding: 4px 10px; font-size: .8rem; }
                table { width: 100%; border-collapse: collapse; font-size: .88rem; }
                th { text-align: left; padding: 9px 12px; background: #fafafa;
                     border-bottom: 2px solid #e0e0e0; font-weight: 500; color: #424242; }
                td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
                .actions { display: flex; gap: 6px; white-space: nowrap; }
                .chip { display: inline-block; background: #e3f2fd; color: #1565c0;
                        border-radius: 12px; padding: 2px 8px; font-size: .78rem; margin: 1px; }
                .chip-role { background: #fce4ec; color: #880e4f; }
                .none { color: #bdbdbd; }
                .notice { font-size: .83rem; color: #757575; margin-bottom: 14px; }
                .notice code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: .85em; }
                .empty td { color: #9e9e9e; font-style: italic; padding: 20px 12px; text-align: center; }
              </style>
            </head>
            <body>
              <header>
                <h1>Dev Stubs Admin</h1>
              </header>
              <nav>
                <button class="active" onclick="showSection('users', this)">Users</button>
                <button onclick="showSection('projects', this)">Projects</button>
                <button onclick="showSection('dbl', this)">DBL Resources</button>
              </nav>
              <main>

                <!-- ── USERS ──────────────────────────────────────────────── -->
                <section id="sec-users" class="visible">
                  <div class="card">
                    <h2 id="form-title">Add User</h2>
                    <form id="user-form" onsubmit="submitUser(event)">
                      <input type="hidden" id="edit-id" />
                      <div class="form-row">
                        <div>
                          <label for="f-name">Name</label>
                          <input id="f-name" type="text" required placeholder="Dev User" />
                        </div>
                        <div>
                          <label for="f-email">Email</label>
                          <input id="f-email" type="text" required placeholder="dev@localhost" />
                        </div>
                      </div>
                      <div class="form-row">
                        <div>
                          <label for="f-ptuser">Paratext Username</label>
                          <input id="f-ptuser" type="text" placeholder="DevUser" />
                        </div>
                        <div>
                          <label for="f-roles">Roles <small>(comma-separated)</small></label>
                          <input id="f-roles" type="text" placeholder="system_admin" />
                        </div>
                      </div>
                      <div class="form-actions">
                        <button type="submit" class="btn btn-primary" id="submit-btn">Add User</button>
                        <button type="button" class="btn btn-secondary" id="cancel-btn"
                                style="display:none" onclick="cancelEdit()">Cancel</button>
                      </div>
                    </form>
                  </div>
                  <div class="card">
                    <h2>Existing Users</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>User ID</th><th>Name</th><th>Email</th>
                          <th>Paratext Username</th><th>Roles</th><th></th>
                        </tr>
                      </thead>
                      <tbody id="users-tbody"></tbody>
                    </table>
                  </div>
                </section>

                <!-- ── PROJECTS ───────────────────────────────────────────── -->
                <section id="sec-projects">
                  <div class="card">
                    <h2>Paratext Projects</h2>
                    <p class="notice">
                      Projects are defined in <code>appsettings.json</code> under
                      <code>LocalDevParatext:Projects</code>. This stub serves as both the
                      Registry server (<code>/api8/…</code>) and the Send/Receive server
                      (<code>/listrepos</code>).
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Paratext ID</th><th>Short Name</th><th>Full Name</th>
                          <th>Language</th><th>User Roles</th>
                        </tr>
                      </thead>
                      <tbody id="projects-tbody"></tbody>
                    </table>
                  </div>
                </section>

                <!-- ── DBL RESOURCES ──────────────────────────────────────── -->
                <section id="sec-dbl">
                  <div class="card">
                    <h2>DBL Resources</h2>
                    <p class="notice">
                      Resources are read from <code>.p8z</code> files in the configured resources
                      directory (<code>dev-dbl/resources/</code> by default, overridable via
                      <code>LocalDevDbl:ResourcesDir</code> in <code>appsettings.json</code>).
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th><th>Revision</th><th>Name</th><th>Full Name</th><th>Language</th>
                        </tr>
                      </thead>
                      <tbody id="dbl-tbody"></tbody>
                    </table>
                  </div>
                </section>

              </main>
              <script>
                let allUsers = {};
                let editingId = null;

                function showSection(name, btn) {
                  document.querySelectorAll('section').forEach(s => s.classList.remove('visible'));
                  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
                  document.getElementById('sec-' + name).classList.add('visible');
                  btn.classList.add('active');
                  if (name === 'users') loadUsers();
                  else if (name === 'projects') loadProjects();
                  else if (name === 'dbl') loadDbl();
                }

                // Minimal HTML escaping so user-supplied strings don't break table markup.
                function esc(s) {
                  return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                }

                function loadUsers() {
                  fetch('/dev-auth/users').then(r => r.json()).then(users => {
                    allUsers = {};
                    users.forEach(u => { allUsers[u.userId] = u; });
                    const tbody = document.getElementById('users-tbody');
                    tbody.innerHTML = '';
                    if (!users.length) {
                      tbody.innerHTML = '<tr class="empty"><td colspan="6">No users defined.</td></tr>';
                      return;
                    }
                    users.forEach(u => {
                      const rolesHtml = u.roles.length
                        ? u.roles.map(r => `<span class="chip chip-role">${esc(r)}</span>`).join(' ')
                        : '<span class="none">—</span>';
                      const tr = document.createElement('tr');
                      tr.innerHTML = `
                        <td><code>${esc(u.userId)}</code></td>
                        <td>${esc(u.name)}</td>
                        <td>${esc(u.email)}</td>
                        <td>${esc(u.paratextUsername)}</td>
                        <td>${rolesHtml}</td>
                        <td class="actions">
                          <button class="btn btn-secondary btn-sm"
                                  onclick="editUser('${esc(u.userId)}')">Edit</button>
                          <button class="btn btn-danger btn-sm"
                                  onclick="deleteUser('${esc(u.userId)}')">Delete</button>
                        </td>`;
                      tbody.appendChild(tr);
                    });
                  });
                }

                function editUser(id) {
                  const u = allUsers[id];
                  if (!u) return;
                  editingId = id;
                  document.getElementById('f-name').value = u.name;
                  document.getElementById('f-email').value = u.email;
                  document.getElementById('f-ptuser').value = u.paratextUsername;
                  document.getElementById('f-roles').value = u.roles.join(', ');
                  document.getElementById('form-title').textContent = 'Edit User';
                  document.getElementById('submit-btn').textContent = 'Update User';
                  document.getElementById('cancel-btn').style.display = '';
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                function cancelEdit() {
                  editingId = null;
                  document.getElementById('user-form').reset();
                  document.getElementById('form-title').textContent = 'Add User';
                  document.getElementById('submit-btn').textContent = 'Add User';
                  document.getElementById('cancel-btn').style.display = 'none';
                }

                function submitUser(event) {
                  event.preventDefault();
                  const name = document.getElementById('f-name').value.trim();
                  const email = document.getElementById('f-email').value.trim();
                  const paratextUsername = document.getElementById('f-ptuser').value.trim() || name;
                  const rolesRaw = document.getElementById('f-roles').value.trim();
                  const roles = rolesRaw ? rolesRaw.split(',').map(r => r.trim()).filter(Boolean) : [];
                  const body = { name, email, paratextUsername, roles };
                  const url = editingId ? `/dev-auth/users/${editingId}` : '/dev-auth/users';
                  const method = editingId ? 'PUT' : 'POST';
                  fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  })
                    .then(r => { if (!r.ok) throw new Error('Request failed: ' + r.status); })
                    .then(() => { cancelEdit(); loadUsers(); })
                    .catch(err => alert('Error: ' + err.message));
                }

                function deleteUser(id) {
                  const u = allUsers[id];
                  if (!u || !confirm('Delete user "' + u.name + '" (' + id + ')?')) return;
                  fetch('/dev-auth/users/' + id, { method: 'DELETE' })
                    .then(r => { if (!r.ok) throw new Error('Delete failed: ' + r.status); })
                    .then(() => { if (editingId === id) cancelEdit(); loadUsers(); })
                    .catch(err => alert('Error: ' + err.message));
                }

                function loadProjects() {
                  fetch('/api/projects').then(r => r.json()).then(projects => {
                    const tbody = document.getElementById('projects-tbody');
                    tbody.innerHTML = '';
                    if (!projects.length) {
                      tbody.innerHTML =
                        '<tr class="empty"><td colspan="5">No projects configured. ' +
                        'Add entries to appsettings.json under LocalDevParatext:Projects.</td></tr>';
                      return;
                    }
                    projects.forEach(p => {
                      const rolesHtml = Object.entries(p.userRoles)
                        .map(([u, r]) => `<span class="chip">${esc(u)}: ${esc(r)}</span>`)
                        .join(' ');
                      const tr = document.createElement('tr');
                      tr.innerHTML = `
                        <td><code>${esc(p.paratextId)}</code></td>
                        <td>${esc(p.shortName)}</td>
                        <td>${esc(p.fullName)}</td>
                        <td>${esc(p.languageIsoCode)}</td>
                        <td>${rolesHtml || '<span class="none">—</span>'}</td>`;
                      tbody.appendChild(tr);
                    });
                  });
                }

                function loadDbl() {
                  fetch('/api/resource_entries').then(r => r.json()).then(data => {
                    const resources = data.resources || [];
                    const tbody = document.getElementById('dbl-tbody');
                    tbody.innerHTML = '';
                    if (!resources.length) {
                      tbody.innerHTML =
                        '<tr class="empty"><td colspan="5">No .p8z resource files found ' +
                        'in the resources directory.</td></tr>';
                      return;
                    }
                    resources.forEach(res => {
                      const langParts = [
                        res.languageName,
                        res.languageCode ? '(' + res.languageCode + ')' : ''
                      ].filter(Boolean).join(' ');
                      const tr = document.createElement('tr');
                      tr.innerHTML = `
                        <td><code>${esc(res.id)}</code></td>
                        <td>${esc(res.revision)}</td>
                        <td>${esc(res.name)}</td>
                        <td>${esc(res.fullname || res.nameCommon || '')}</td>
                        <td>${esc(langParts)}</td>`;
                      tbody.appendChild(tr);
                    });
                  });
                }

                // Load users immediately when the page opens.
                loadUsers();
              </script>
            </body>
            </html>
            """;
        return Results.Content(html, "text/html; charset=utf-8");
    }
);



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
/// Returns the list of pre-defined dev users including all fields used by the admin UI.
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
                paratextUsername = u.ParatextUsername,
            })
        )
);

/// <summary>
/// Creates a new dev user. The new user is immediately available for login.
/// Changes are in-memory and reset when the stub restarts.
/// </summary>
app.MapPost(
    "/dev-auth/users",
    (DevUserMutation req) =>
    {
        string id = "devUser" + Guid.NewGuid().ToString("N")[..8];
        var user = new DevUser(
            UserId: id,
            Name: req.Name,
            Email: req.Email,
            Roles: req.Roles ?? [],
            ParatextUsername: string.IsNullOrEmpty(req.ParatextUsername) ? req.Name : req.ParatextUsername
        );
        devUsers.Add(user);
        return Results.Ok(new { userId = id });
    }
);

/// <summary>
/// Updates an existing dev user's name, email, roles, and Paratext username.
/// Changes are in-memory and reset when the stub restarts.
/// </summary>
app.MapPut(
    "/dev-auth/users/{id}",
    (string id, DevUserMutation req) =>
    {
        int idx = devUsers.FindIndex(u => u.UserId == id);
        if (idx < 0)
            return Results.NotFound();
        devUsers[idx] = devUsers[idx] with
        {
            Name = req.Name,
            Email = req.Email,
            Roles = req.Roles ?? [],
            ParatextUsername = string.IsNullOrEmpty(req.ParatextUsername) ? req.Name : req.ParatextUsername,
        };
        return Results.Ok();
    }
);

/// <summary>
/// Deletes a dev user by user ID.
/// Changes are in-memory and reset when the stub restarts.
/// </summary>
app.MapDelete(
    "/dev-auth/users/{id}",
    (string id) =>
    {
        int removed = devUsers.RemoveAll(u => u.UserId == id);
        return removed > 0 ? Results.Ok() : Results.NotFound();
    }
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

// ─── DBL (Digital Bible Library) stub endpoints (/api/resource_entries) ────────

// Default resources directory: {repo-root}/dev-dbl/resources/ regardless of CWD.
// Override via LocalDevDbl:ResourcesDir in appsettings.json (absolute or relative to CWD).
string? configuredResourcesDir = app.Configuration["LocalDevDbl:ResourcesDir"];
string dblResourcesDir = Path.GetFullPath(
    string.IsNullOrEmpty(configuredResourcesDir)
        ? Path.Combine(app.Environment.ContentRootPath, "..", "..", "dev-dbl", "resources")
        : configuredResourcesDir
);

/// <summary>
/// Returns a JSON list of all .p8z resources found in the configured directory.
/// Supports the optional <c>?id=&lt;resourceId&gt;</c> query parameter to filter
/// to a single resource (used by <c>SFInstallableDblResource.CheckResourcePermission</c>).
/// Called by <c>SFInstallableDblResource.GetInstallableDblResources</c> via the main app.
/// </summary>
app.MapGet(
    "/api/resource_entries",
    (HttpRequest request) =>
    {
        string? filterById = request.Query["id"].FirstOrDefault();
        var resources = new JArray();
        if (Directory.Exists(dblResourcesDir))
        {
            foreach (string p8zPath in Directory.EnumerateFiles(dblResourcesDir, "*.p8z"))
            {
                JObject? meta = TryReadDblResourceMetadata(p8zPath);
                if (meta == null)
                    continue;
                if (filterById != null && (string?)meta["id"] != filterById)
                    continue;
                resources.Add(meta);
            }
        }
        return Results.Content(
            new JObject(new JProperty("resources", resources)).ToString(),
            "application/json"
        );
    }
);

/// <summary>
/// Serves the raw .p8z file for the DBL resource identified by <paramref name="id"/>.
/// Called by <c>ISFRestClient.GetFile</c> via <c>SFInstallableDblResource.Install</c>.
/// </summary>
app.MapGet(
    "/api/resource_entries/{id}",
    (string id) =>
    {
        if (Directory.Exists(dblResourcesDir))
        {
            foreach (string p8zPath in Directory.EnumerateFiles(dblResourcesDir, "*.p8z"))
            {
                JObject? meta = TryReadDblResourceMetadata(p8zPath);
                if ((string?)meta?["id"] == id)
                    return Results.File(p8zPath, "application/octet-stream", Path.GetFileName(p8zPath));
            }
        }
        return Results.NotFound();
    }
);


/// <summary>
/// Returns all configured Paratext projects. Used by the admin UI to display
/// the projects managed by this stub (Registry + Send/Receive server).
/// </summary>
app.MapGet(
    "/api/projects",
    () =>
        Results.Ok(
            devProjects.Select(p => new
            {
                paratextId = p.ParatextId,
                shortName = p.ShortName,
                fullName = p.FullName,
                languageIsoCode = p.LanguageIsoCode,
                userRoles = p.UserRoles,
            })
        )
);



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

// ─── DBL helper functions ─────────────────────────────────────────────────────

/// <summary>
/// Opens a .p8z zip file and returns the resource metadata in the JSON format expected
/// by <c>SFInstallableDblResource.ConvertJsonResponseToInstallableDblResources</c>.
/// Reads from <c>.dbl/metadata.xml</c> if present; otherwise falls back to the
/// <c>.dbl/id/</c> and <c>.dbl/revision/</c> sentinel-filename conventions used by DBL.
/// Returns <c>null</c> if the file cannot be read or does not contain a recognisable
/// DBL structure.
/// </summary>
JObject? TryReadDblResourceMetadata(string p8zPath)
{
    try
    {
        using ZipArchive archive = ZipFile.OpenRead(p8zPath);
        string? id = null,
            revision = null,
            name = null,
            fullname = null;
        string? languageName = null,
            languageCode = null,
            languageLDML = null;

        // Prefer .dbl/metadata.xml when available (standard DBL structure).
        ZipArchiveEntry? metadataEntry = archive.GetEntry(".dbl/metadata.xml");
        if (metadataEntry != null)
        {
            using Stream metaStream = metadataEntry.Open();
            XDocument doc = XDocument.Load(metaStream);
            XElement? root = doc.Root;
            id = root?.Attribute("id")?.Value;
            revision = root?.Attribute("revision")?.Value;
            XElement? ident = root?.Element("identification");
            name = ident?.Element("name")?.Value;
            fullname =
                ident?.Element("nameCommon")?.Value
                ?? ident?.Element("nameLocal")?.Value
                ?? name;
            XElement? lang = root?.Element("language");
            languageCode = lang?.Element("iso")?.Value;
            languageLDML = lang?.Element("ldml")?.Value;
            languageName = lang?.Element("name")?.Value;
        }

        // Fall back to the sentinel-filename convention (.dbl/id/{id} and .dbl/revision/{n}).
        if (string.IsNullOrEmpty(id))
        {
            foreach (ZipArchiveEntry entry in archive.Entries)
            {
                bool isDir = entry.FullName.EndsWith('/');
                if (!isDir && entry.FullName.StartsWith(".dbl/id/", StringComparison.OrdinalIgnoreCase))
                    id = Path.GetFileName(entry.FullName);
                else if (
                    !isDir
                    && entry.FullName.StartsWith(".dbl/revision/", StringComparison.OrdinalIgnoreCase)
                )
                    revision = Path.GetFileName(entry.FullName);
                if (id != null && revision != null)
                    break;
            }
        }

        if (string.IsNullOrEmpty(id))
            return null;

        string baseName = name ?? Path.GetFileNameWithoutExtension(p8zPath);
        string checksum = ComputeMd5Hex(p8zPath);
        return new JObject(
            new JProperty("id", id),
            new JProperty("revision", revision ?? "1"),
            new JProperty("name", baseName),
            new JProperty("nameCommon", fullname ?? baseName),
            new JProperty("fullname", fullname ?? baseName),
            new JProperty("languageName", languageName ?? ""),
            new JProperty("languageCode", languageCode ?? ""),
            new JProperty("languageLDMLId", languageLDML ?? languageCode ?? ""),
            new JProperty("permissions-checksum", checksum),
            new JProperty("p8z-manifest-checksum", checksum)
        );
    }
    catch
    {
        return null;
    }
}

/// <summary>Computes the MD5 hash of a file and returns it as a lowercase hex string.</summary>
string ComputeMd5Hex(string filePath)
{
    using MD5 md5 = MD5.Create();
    using FileStream stream = File.OpenRead(filePath);
    return BitConverter.ToString(md5.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
}

// ─── Request / config types ───────────────────────────────────────────────────

/// <summary>Request body for POST /dev-auth/token.</summary>
record LocalDevTokenRequest(string UserId);

/// <summary>Request body for POST /dev-auth/users and PUT /dev-auth/users/{id}.</summary>
record DevUserMutation(string Name, string Email, string[] Roles, string ParatextUsername);

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

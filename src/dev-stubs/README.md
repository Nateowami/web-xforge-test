# dev-stubs

Standalone local development stub server that replaces Auth0, the Paratext Registry/Send-Receive
server, and the Digital Bible Library (DBL) during offline development.

## Usage

Start the stub **before** starting the main Scripture Forge application:

```sh
dotnet run --project src/dev-stubs
```

The stub listens on **http://localhost:5050** and serves:

| Endpoint                                                        | Purpose                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /.well-known/openid-configuration`                         | OIDC discovery (used by main app JWT middleware and RealtimeServer) |
| `GET /.well-known/jwks.json`                                    | JWT public key (used to validate tokens)                            |
| `GET /dev-auth/users`                                           | List of pre-defined dev users (used by login page)                  |
| `POST /dev-auth/token`                                          | Issues SF access + ID tokens (used by login page)                   |
| `GET /api8/userinfo`                                            | Paratext user info                                                  |
| `POST /api8/token`                                              | Paratext token refresh                                              |
| `GET /api8/my/projects`                                         | Projects the user belongs to                                        |
| `GET /api8/my/licenses`                                         | Licenses for the user's projects                                    |
| `GET /api8/projects/{id}`                                       | Project metadata                                                    |
| `GET /api8/projects/{id}/license`                               | Project license                                                     |
| `GET /api8/projects/{id}/members`                               | All project members                                                 |
| `GET /api8/projects/{id}/members/{userId}`                      | Single member's role                                                |
| `GET /api8/projects/{id}/identification_systemId/paratext/text` | Confirms project is registered                                      |
| `GET /listrepos`                                                | S/R listrepos stub (returns empty list)                             |
| `GET /api/resource_entries`                                     | DBL resource list (reads `.p8z` files from `dev-dbl/resources/`)   |
| `GET /api/resource_entries/{id}`                                | Download a specific DBL resource `.p8z` file                        |

## Configuration

Edit `appsettings.json` to add or change the dev project list and auth settings.

The main app (`appsettings.Development.json`) must point at this stub:

```json
"Auth": { "Domain": "localhost:5050" },
"Paratext": { "LocalRegistryServerUri": "http://localhost:5050" }
```

Setting `LocalRegistryServerUri` also redirects DBL traffic to this stub automatically.

---

## Importing a real Paratext project

By default the stub creates a minimal dev project (`DevPT01`) with embedded sample Scripture
(Matthew 1–5 and Jonah 1–4, World English Bible). To test with a real project instead:

### 1. Copy the Mercurial repository

Copy the project's Mercurial repository to:

```
{SiteDir}/dev-paratext/repos/{paratextId}/
```

`SiteDir` defaults to `/var/lib/scriptureforge` (set in `appsettings.json`). The `{paratextId}`
directory must contain the `.hg/` folder and the working-directory files.

```sh
cp -r /path/to/real/project/* /var/lib/scriptureforge/dev-paratext/repos/4e51b77b2c18ee2c2bde5a18bcc880a2/
```

> **Tip:** If the imported history is in the draft Mercurial phase, the stub will promote it to
> public automatically on the first sync. `ProjectUsers.xml` is also updated automatically to
> match the configured dev user roles so the dev usernames work even if the real project used
> different Paratext usernames.

### 2. Register the project in configuration

Add (or update) the project entry in **both** config files:

**`src/SIL.XForge.Scripture/appsettings.Development.json`** — `LocalDevParatext:Projects`:

```json
{
  "ParatextId": "4e51b77b2c18ee2c2bde5a18bcc880a2",
  "ShortName": "MyProject",
  "FullName":  "My Real Project",
  "LanguageIsoCode": "eng",
  "UserRoles": {
    "DevAdmin": "pt_administrator",
    "DevUser":  "pt_translator"
  }
}
```

**`src/dev-stubs/appsettings.json`** — same `LocalDevParatext:Projects` section (the stub
serves the registry metadata; the main app serves the Hg repository).

### 3. Sync the project in SF

Log in, open the project, and trigger a sync. The stub will bundle the imported Hg history and
deliver it to the main app as it would in a real Paratext Send/Receive.

---

## Adding DBL resources

The stub serves `.p8z` Digital Bible Library resource files placed in:

```
dev-dbl/resources/
```

(relative to the repository root, resolved automatically regardless of working directory).

### 1. Copy the `.p8z` file

```sh
cp /path/to/resource.p8z dev-dbl/resources/
```

The stub reads the resource metadata directly from the zip file (`.dbl/metadata.xml` or the
`.dbl/id/` and `.dbl/revision/` sentinel-file conventions). No extra manifest is needed.

### 2. Override the resources directory (optional)

To store resources elsewhere, set `LocalDevDbl:ResourcesDir` in `src/dev-stubs/appsettings.json`:

```json
"LocalDevDbl": {
  "ResourcesDir": "/absolute/path/to/my/resources"
}
```

Relative paths are resolved from the current working directory when `dotnet run` is invoked.

### 3. Use the resource in SF

Log in and navigate to **Connect project → Source** (or the resource browsing UI). The stub will
return your `.p8z` files in the resource list and serve them for installation.

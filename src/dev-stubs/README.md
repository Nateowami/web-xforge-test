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
| `GET /admin`                                                    | Admin dashboard (manage users; view projects and DBL resources)     |
| `GET /.well-known/openid-configuration`                         | OIDC discovery (used by main app JWT middleware and RealtimeServer) |
| `GET /.well-known/jwks.json`                                    | JWT public key (used to validate tokens)                            |
| `GET /dev-auth/users`                                           | List of dev users (used by login page and admin UI)                 |
| `POST /dev-auth/users`                                          | Create a new dev user (admin UI)                                    |
| `PUT /dev-auth/users/{id}`                                      | Update a dev user (admin UI)                                        |
| `DELETE /dev-auth/users/{id}`                                   | Delete a dev user (admin UI)                                        |
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
| `GET /api/projects`                                             | All configured projects (used by admin UI)                          |
| `GET /listrepos`                                                | S/R listrepos stub (returns empty list)                             |
| `GET /api/resource_entries`                                     | DBL resource list (reads `.p8z` files from `dev-dbl/resources/`)   |
| `GET /api/resource_entries/{id}`                                | Download a specific DBL resource `.p8z` file                        |

## Admin UI

Open **http://localhost:5050/admin** in a browser while the stub is running to access the
management dashboard. It provides:

- **Users** — create, edit, and delete dev users (changes are in-memory; reset on restart)
- **Projects** — read-only view of all configured Paratext projects (edit `appsettings.json` to change)
- **DBL Resources** — read-only list of `.p8z` resource files in the resources directory

---

## Configuration

Edit `appsettings.json` to change auth settings or add custom auth keys.

The main app (`appsettings.Development.json`) must point at this stub:

```json
"Auth": { "Domain": "localhost:5050" },
"Paratext": { "LocalRegistryServerUri": "http://localhost:5050" }
```

Setting `LocalRegistryServerUri` also redirects DBL traffic to this stub automatically.

Project configuration (the `LocalDevParatext:Projects` list) lives in the git-ignored
`src/dev-stubs/dev-config.json` file.  When that file is absent, both apps fall back to the
`LocalDevParatext:Projects` entries in their respective `appsettings.json` /
`appsettings.Development.json` files (which include the built-in `DevPT01` sample project).

---

## Importing a real Paratext project

By default the stub creates a minimal dev project (`DevPT01`) with embedded sample Scripture
(Matthew 1–5 and Jonah 1–4, World English Bible). To test with a real project instead, use the
import script:

```sh
deno run --allow-read --allow-write scripts/import-paratext-project.mts /path/to/ParatextProject
```

The script will:
1. Read `Settings.xml` from the project directory to extract the Paratext ID, short name, full
   name, and language code automatically.
2. Copy the project directory (including the `.hg/` Mercurial repository) to
   `src/dev-stubs/repos/<paratextId>/`.
3. Create or update `src/dev-stubs/dev-config.json` with the project entry.

After running the script, restart the stub and the main app, then log in and trigger a sync in
Scripture Forge.

> **Tip:** If the imported history is in the draft Mercurial phase, the stub will promote it to
> public automatically on the first sync. `ProjectUsers.xml` is also updated automatically to
> match the configured dev user roles so the dev usernames work even if the real project used
> different Paratext usernames.

### Manual import (without the script)

If you prefer to configure things by hand:

1. Copy the project directory to `src/dev-stubs/repos/<paratextId>/`.
2. Create or edit `src/dev-stubs/dev-config.json` (see `dev-config.example.json` for the format)
   and add the project entry.  Set `LocalDevParatext:ReposDir` to the absolute path of
   `src/dev-stubs/repos/`.

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

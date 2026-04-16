# dev-stubs

Standalone local development stub server that replaces Auth0 and the Paratext Registry/Send-Receive
server during offline development.

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

## Configuration

Edit `appsettings.json` to add or change the dev project list and auth settings.

The main app (`appsettings.Development.json`) must point at this stub:

```json
"Auth": { "Domain": "localhost:5050" },
"Paratext": { "LocalRegistryServerUri": "http://localhost:5050" }
```

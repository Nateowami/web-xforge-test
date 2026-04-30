namespace SIL.XForge.Configuration;

/// <summary>
/// This class defines the authentication configuration.
/// </summary>
public class AuthOptions : PublicAuthOptions
{
    public string BackendClientId { get; init; } = string.Empty;
    public string BackendClientSecret { get; init; } = string.Empty;
    public string HealthCheckApiKey { get; init; } = string.Empty;
    public string ManagementAudience { get; init; } = string.Empty;
    public string WebhookUsername { get; init; } = string.Empty;
    public string WebhookPassword { get; init; } = string.Empty;

    /// <summary>
    /// When true, uses a locally generated RSA key for JWT issuance and validation instead of Auth0.
    /// This enables fully offline local development without requiring any Auth0 account or credentials.
    /// Should only be enabled in the Development environment.
    /// </summary>
    public bool UseLocalAuth { get; init; } = false;
}

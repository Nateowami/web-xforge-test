#nullable disable warnings
namespace SIL.XForge.Configuration;

public class ParatextOptions
{
    public string ClientId { get; set; } = "client_id";
    public string ClientSecret { get; set; } = "client_secret";
    public string HgExe { get; set; }
    public string ResourcePasswordBase64 { get; set; }
    public string ResourcePasswordHash { get; set; }

    /// <summary>
    /// When running in local development mode with <c>Auth:UseLocalAuth</c> set to true, this URI points to the
    /// backend server itself (e.g. <c>http://localhost:5000</c>), which hosts a local stub registry at
    /// <c>/api8/...</c>. When null or empty, the standard Paratext registry servers are used.
    /// </summary>
    public string? LocalRegistryServerUri { get; set; }
}

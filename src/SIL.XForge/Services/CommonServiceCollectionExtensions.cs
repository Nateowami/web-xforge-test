using Microsoft.Extensions.Configuration;
using SIL.XForge.Configuration;
using SIL.XForge.Services;

namespace Microsoft.Extensions.DependencyInjection;

public static class CommonServiceCollectionExtensions
{
    /// <summary>
    /// Adds miscellaneous services that are common to all xForge applications to the DI container.
    /// When <paramref name="configuration"/> is provided and <c>Auth:UseLocalAuth</c> is true,
    /// registers local development auth services instead of the real Auth0-backed services.
    /// </summary>
    public static IServiceCollection AddCommonServices(
        this IServiceCollection services,
        IConfiguration? configuration = null
    )
    {
        services.AddScoped<IUserAccessor, UserAccessor>();
        services.AddScoped<IHttpRequestAccessor, HttpRequestAccessor>();
        services.AddTransient<IEmailService, EmailService>();
        services.AddTransient<IFileSystemService, FileSystemService>();

        var authOptions = configuration?.GetOptions<AuthOptions>();
        if (authOptions?.UseLocalAuth == true)
        {
            services.AddSingleton<IAuthService, LocalDevAuthService>();
        }
        else
        {
            services.AddSingleton<IAuthService, AuthService>();
        }

        // LocalDevKeyProvider is used by LocalDevAuthService to generate Paratext access tokens
        // for the management API stub. The Paratext tokens only need a username claim, not
        // signature validation, so any key works here.
        services.AddSingleton<LocalDevKeyProvider>();

        services.AddSingleton<IUserService, UserService>();
        services.AddSingleton<ISecurityService, SecurityService>();
        services.AddSingleton<IAudioService, AudioService>();
        return services;
    }
}

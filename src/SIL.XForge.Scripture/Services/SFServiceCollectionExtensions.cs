using Microsoft.Extensions.Configuration;
using SIL.XForge.Configuration;
using SIL.XForge.Scripture.Services;
using SIL.XForge.Services;

namespace Microsoft.Extensions.DependencyInjection;

public static class SFServiceCollectionExtensions
{
    /// <summary>
    /// Adds miscellaneous services that are common to all xForge applications to the DI container.
    /// Pass <paramref name="configuration"/> to enable local dev auth services when
    /// <c>Auth:UseLocalAuth</c> is true.
    /// </summary>
    public static IServiceCollection AddSFServices(
        this IServiceCollection services,
        IConfiguration? configuration = null
    )
    {
        services.AddCommonServices(configuration);
        services.AddTransient<IRazorPageSettings, RazorPageSettings>();
        services.AddSingleton<IAnonymousService, AnonymousService>();
        services.AddSingleton<ISyncService, SyncService>();
        services.AddSingleton<IParatextService, ParatextService>();
        services.AddTransient<IDeltaUsxMapper, DeltaUsxMapper>();
        services.AddTransient<IParatextNotesMapper, ParatextNotesMapper>();
        services.AddSingleton<IGuidService, GuidService>();
        services.AddSingleton<ISFProjectService, SFProjectService>();
        services.AddSingleton<IProjectService, SFProjectService>();
        services.AddSingleton<IJwtTokenHelper, JwtTokenHelper>();
        services.AddSingleton<IParatextDataHelper, ParatextDataHelper>();
        services.AddSingleton<ITransceleratorService, TransceleratorService>();
        services.AddSingleton<ISFRestClientFactory, SFDblRestClientFactory>();
        services.AddSingleton<IHgWrapper, HgWrapper>();
        services.AddSingleton<ISFProjectRights, SFProjectRights>();
        services.AddTransient<IParatextSyncRunner, ParatextSyncRunner>();

        var authOptions = configuration?.GetOptions<SIL.XForge.Configuration.AuthOptions>();
        if (authOptions?.UseLocalAuth == true)
        {
            // In local dev mode, use the stub source provider that reads from LocalDevParatextOptions
            // and operates on local Hg repos rather than the real Paratext servers.
            services.Configure<SIL.XForge.Configuration.LocalDevParatextOptions>(
                configuration!.GetSection("LocalDevParatext")
            );
            services.AddSingleton<
                IInternetSharedRepositorySourceProvider,
                LocalDevInternetSharedRepositorySourceProvider
            >();
        }
        else
        {
            services.AddSingleton<IInternetSharedRepositorySourceProvider, InternetSharedRepositorySourceProvider>();
        }

        return services;
    }
}

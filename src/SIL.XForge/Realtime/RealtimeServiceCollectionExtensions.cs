using System;
using System.IO;
using System.Reflection;
using Jering.Javascript.NodeJS;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SIL.XForge.Configuration;
using SIL.XForge.Realtime;

namespace Microsoft.Extensions.DependencyInjection;

public static class RealtimeServiceCollectionExtensions
{
    public static IServiceCollection AddRealtimeServer(
        this IServiceCollection services,
        ILoggerFactory loggerFactory,
        IConfiguration configuration,
        Action<RealtimeOptions> configureOptions,
        string? nodeOptions = null
    )
    {
        services.AddNodeJS();
        services.Configure<NodeJSProcessOptions>(options =>
        {
            options.ProjectPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(nodeOptions))
            {
                options.NodeAndV8Options = nodeOptions;
            }
        });

        // Disable timeout so the debugger can be paused
        if (nodeOptions?.Contains("--inspect", StringComparison.OrdinalIgnoreCase) == true)
        {
            services.Configure<OutOfProcessNodeJSServiceOptions>(options => options.TimeoutMS = -1);
        }

        services.AddSingleton<IJsonService, RealtimeJsonService>();

        services.Configure(configureOptions);
        services.AddSingleton<IRealtimeServer, RealtimeServer>();
        services.AddSingleton<IRealtimeService, RealtimeService>();
        return services;
    }
}

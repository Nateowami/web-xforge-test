#nullable disable warnings
using System.IO;
using System.Reflection;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace SIL.XForge.Scripture;

public static class Program
{
    public static void Main(string[] args) => CreateWebHostBuilder(args).Build().Run();

    public static IWebHostBuilder CreateWebHostBuilder(string[] args)
    {
        IWebHostBuilder builder = WebHost.CreateDefaultBuilder(args);
        string environment = builder.GetSetting("environment");

        IConfigurationRoot configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("hosting.json", true, true)
            .AddJsonFile($"hosting.{environment}.json", true, true)
            .AddEnvironmentVariables()
            .Build();

        // When an external RealtimeServer process is in use (e.g. in a separate docker container),
        // expect realtimeserver migrations to have already been run (eg by container start.sh).
        bool useExistingRealtimeServer = configuration.GetValue<bool>("Realtime:UseExistingRealtimeServer");
        if (!useExistingRealtimeServer)
        {
            Migrator.RunMigrations(environment);
        }

        return builder
            .ConfigureAppConfiguration(
                (context, config) =>
                {
                    IWebHostEnvironment env = context.HostingEnvironment;
                    if (env.IsDevelopment() || env.IsEnvironment("Testing"))
                        config.AddJsonFile("appsettings.user.json", true);
                    else
                        config.AddJsonFile("secrets.json", true, true);
                    // Load the local dev project config written by scripts/import-paratext-project.mts.
                    // This file is git-ignored and overrides the LocalDevParatext:Projects section in
                    // appsettings.Development.json so developers do not need to edit that file manually.
                    if (env.IsDevelopment())
                    {
                        string devConfigPath = Path.GetFullPath(
                            Path.Combine(env.ContentRootPath, "..", "dev-stubs", "dev-config.json")
                        );
                        config.AddJsonFile(devConfigPath, optional: true, reloadOnChange: false);
                    }
                    // Manually read in secrets for development-related environments that aren't specifically "Development".
                    if (env.IsEnvironment("Testing"))
                    {
                        var appAssembly = Assembly.Load(new AssemblyName(env.ApplicationName));
                        if (appAssembly != null)
                            config.AddUserSecrets(appAssembly, true);
                    }
                }
            )
            .UseConfiguration(configuration)
            .UseStartup<Startup>();
    }
}

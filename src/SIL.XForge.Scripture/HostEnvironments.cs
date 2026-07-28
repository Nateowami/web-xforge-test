using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace SIL.XForge.Scripture;

/// <summary>
/// Determines which environment the app runs as, and therefore which appsettings and hosting
/// settings it loads.
/// </summary>
/// <remarks>
/// <para>
/// The default is <see cref="Environments.Development"/>, and an unrecognized environment name is
/// an error, so that neither forgetting to set ASPNETCORE_ENVIRONMENT nor misspelling it (e.g.
/// "QA" instead of "Staging") can quietly run the app against the QA or Live servers.
/// </para>
/// <para>
/// Because of that, a deployed app must state which environment it is: <c>scripts/build-and-ship</c>
/// writes <see cref="EnvironmentFileName"/> into the published app for that purpose. Anything set in
/// the environment (ASPNETCORE_ENVIRONMENT, DOTNET_ENVIRONMENT) or on the command line
/// (--environment) still takes precedence over that file.
/// </para>
/// </remarks>
public static class HostEnvironments
{
    /// <summary>The environment used by the automated tests.</summary>
    public const string Testing = "Testing";

    /// <summary>An optional JSON file, of the form <c>{ "environment": "Production" }</c>, in which a
    /// deployed app states the environment it was deployed as.</summary>
    public const string EnvironmentFileName = "environment.json";

    /// <summary>The environment names the app has settings for.</summary>
    public static readonly IReadOnlyList<string> Supported =
    [
        Environments.Development,
        Testing,
        Environments.Staging,
        Environments.Production,
    ];

    /// <summary>
    /// Gets the environment the app should run as, from the command line, the environment variables,
    /// and <see cref="EnvironmentFileName"/>, in that order of precedence.
    /// </summary>
    /// <exception cref="InvalidOperationException">The requested environment is not supported.</exception>
    public static string Resolve(string[] args, string basePath)
    {
        // The sources are ordered to match how the host itself resolves the environment, so that the
        // environment we determine here is the one the host would have used, if it were specified.
        IConfiguration configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile(EnvironmentFileName, optional: true)
            .AddEnvironmentVariables("DOTNET_")
            .AddCommandLine(args)
            .AddEnvironmentVariables("ASPNETCORE_")
            .Build();
        return Resolve(configuration[HostDefaults.EnvironmentKey]);
    }

    /// <summary>
    /// Gets the environment the app should run as, given the environment that was requested, if any.
    /// </summary>
    /// <exception cref="InvalidOperationException">The requested environment is not supported.</exception>
    public static string Resolve(string? requestedEnvironment)
    {
        if (string.IsNullOrWhiteSpace(requestedEnvironment))
            return Environments.Development;

        // Match case-insensitively, but use the canonical name, as the settings file names and some
        // comparisons on the environment name are case-sensitive.
        string requested = requestedEnvironment.Trim();
        string? environment = Supported.FirstOrDefault(e =>
            string.Equals(e, requested, StringComparison.OrdinalIgnoreCase)
        );
        return environment
            ?? throw new InvalidOperationException(
                $"'{requested}' is not an environment this app has settings for."
                    + $" Specify one of {string.Join(", ", Supported)},"
                    + $" or nothing at all to run as {Environments.Development}."
            );
    }
}

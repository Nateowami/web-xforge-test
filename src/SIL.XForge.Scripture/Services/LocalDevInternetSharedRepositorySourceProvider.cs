#nullable disable warnings
using System;
using System.IO;
using Microsoft.Extensions.Options;
using SIL.XForge.Configuration;
using SIL.XForge.Models;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// A local-development-only implementation of <see cref="IInternetSharedRepositorySourceProvider"/> that
/// creates <see cref="LocalDevInternetSharedRepositorySource"/> instances backed by local Mercurial
/// repositories instead of the real Paratext servers. Only used when <c>Auth:UseLocalAuth</c> is
/// <c>true</c>.
/// </summary>
public class LocalDevInternetSharedRepositorySourceProvider : IInternetSharedRepositorySourceProvider
{
    private readonly LocalDevParatextOptions _config;
    private readonly IHgWrapper _hgWrapper;
    private readonly IJwtTokenHelper _jwtTokenHelper;
    private readonly IOptions<SiteOptions> _siteOptions;

    public LocalDevInternetSharedRepositorySourceProvider(
        IOptions<LocalDevParatextOptions> config,
        IHgWrapper hgWrapper,
        IJwtTokenHelper jwtTokenHelper,
        IOptions<SiteOptions> siteOptions
    )
    {
        _config = config.Value;
        _hgWrapper = hgWrapper;
        _jwtTokenHelper = jwtTokenHelper;
        _siteOptions = siteOptions;
    }

    /// <summary>
    /// Returns a <see cref="LocalDevInternetSharedRepositorySource"/> for the given user.
    /// The <paramref name="sendReceiveServerUri"/> and <paramref name="registryServerUri"/> parameters are
    /// accepted for interface compatibility but not used; all data is served from local configuration and
    /// Hg repositories.
    /// </summary>
    public IInternetSharedRepositorySource GetSource(
        UserSecret userSecret,
        string sendReceiveServerUri,
        string registryServerUri
    )
    {
        if (userSecret == null)
            throw new ArgumentNullException(nameof(userSecret));

        string ptUsername = _jwtTokenHelper.GetParatextUsername(userSecret);
        if (string.IsNullOrEmpty(ptUsername))
            throw new Exception($"Failed to get a Paratext username for SF user id {userSecret.Id}.");

        string devReposDir = Path.Combine(_siteOptions.Value.SiteDir, "dev-paratext", "repos");
        Directory.CreateDirectory(devReposDir);

        return new LocalDevInternetSharedRepositorySource(ptUsername, _config, _hgWrapper, devReposDir);
    }
}

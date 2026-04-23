using System.Collections.Generic;

namespace SIL.XForge.Configuration;

/// <summary>
/// Top-level configuration for the local development Paratext server.
/// This is only used when <c>Auth:UseLocalAuth</c> is <c>true</c>.
/// </summary>
public class LocalDevParatextOptions
{
    /// <summary>
    /// The list of dev Paratext projects available in local development mode.
    /// Each project corresponds to a Mercurial repository under
    /// <c>{SiteDir}/dev-paratext/repos/{ParatextId}/</c>.
    /// </summary>
    public List<LocalDevParatextProject> Projects { get; set; } = [];
}

/// <summary>
/// Configuration for a single dev Paratext project in local development mode.
/// </summary>
public class LocalDevParatextProject
{
    /// <summary>
    /// The 32-character hex Paratext project ID (UUID without dashes).
    /// </summary>
    public string ParatextId { get; set; } = string.Empty;

    /// <summary>
    /// The short (abbreviated) project name.
    /// </summary>
    public string ShortName { get; set; } = string.Empty;

    /// <summary>
    /// The full (display) project name.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// The ISO 639 language code for the project.
    /// </summary>
    public string LanguageIsoCode { get; set; } = "eng";

    /// <summary>
    /// Maps Paratext usernames to project roles.
    /// Valid roles match Paratext role strings, e.g. <c>"pt_administrator"</c>, <c>"pt_translator"</c>.
    /// </summary>
    public Dictionary<string, string> UserRoles { get; set; } = [];
}

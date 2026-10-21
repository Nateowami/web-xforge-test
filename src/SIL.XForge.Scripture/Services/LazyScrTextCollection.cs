using System;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using Paratext.Data;
using Paratext.Data.ProjectFileAccess;
using Paratext.Data.ProjectSettingsAccess;
using PtxUtils;
using SIL.Scripture;
using SIL.XForge.Scripture.Models;
using SIL.XForge.Services;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// A class that can be used to get a ScrText without using a cache. This class is not
/// related by inheritance or type to ScrTextCollection.
/// </summary>
public class LazyScrTextCollection : IScrTextCollection
{
    /// <summary> Path of directory containing projects. </summary>
    private string _settingsDirectory = string.Empty;

    internal IFileSystemService FileSystemService { get; set; } = new FileSystemService();

    /// <summary> Set the directory to the folder containing Paratext projects. </summary>
    public void Initialize(string projectsPath)
    {
        _settingsDirectory = projectsPath;
        // Initialize so that Paratext.Data can find settings files
        ScrTextCollection.Implementation = new SFScrTextCollection();
        ScrTextCollection.Initialize(projectsPath);
        // Allow use of custom versification systems
        Versification.Table.Implementation = new SFVersificationTable(
            GetVersificationProjectId,
            GetCustomVersification
        );
    }

    /// <summary>
    /// Get a ScrText for a given user from the data for a paratext project with the target project ID and type. Not to
    /// be confused with ParatextData ScrTextCollection.FindById, which this is not an override of.
    /// </summary>
    /// <param name="ptUsername"> The username of the user retrieving the ScrText. </param>
    /// <param name="projectId"> The ID of the target project. </param>
    public ScrText? FindById(string ptUsername, string? projectId)
    {
        // Get the path to the project
        string? projectPath = GetProjectPath(projectId);
        if (projectPath is null)
            return null;

        // Get the path to the settings file
        string? settingsFile = GetSettingsFilePath(projectPath);
        if (settingsFile is null)
            return null;

        // Get the project name from the settings file
        string? name = GetNameFromSettings(settingsFile);
        if (name is null)
            return null;

        ScrText scrText = CreateScrText(ptUsername, new ProjectName { ProjectPath = projectPath, ShortName = name });

        // If there is a base text, set the versification to the base text
        if (scrText.Settings.TranslationInfo is { IsValidDerivedTranslation: true, BaseProjectGuid: not null })
        {
            // Get the path to the base project
            string? baseProjectPath = GetProjectPath(scrText.Settings.TranslationInfo.BaseProjectGuid.Id);
            if (baseProjectPath is null)
                return scrText;

            // Get the path to the base project's settings file
            string? baseSettingsFile = GetSettingsFilePath(baseProjectPath);
            if (baseSettingsFile is null)
                return scrText;

            // Only the versification type is set here, as setting a customized versification would store it as
            // Unknown. The SFVersificationTable applies the base project's customizations when the versification is
            // loaded.
            scrText.Settings.Versification = GetVersificationFromSettings(baseSettingsFile);
        }

        // Return the Scripture Text object
        return scrText;
    }

    public virtual ResourceScrText CreateResourceScrText(
        string ptUsername,
        ProjectName projectName,
        IZippedResourcePasswordProvider passwordProvider
    )
    {
        var associatedUser = new SFParatextUser(ptUsername);
        return new ResourceScrText(projectName, associatedUser, passwordProvider);
    }

    protected internal virtual ScrText CreateScrText(string ptUsername, ProjectName projectName)
    {
        var associatedUser = new SFParatextUser(ptUsername);
        return new ScrText(projectName, associatedUser);
    }

    /// <summary>
    /// Gets the name of the project from its Settings file.
    /// </summary>
    /// <param name="settingsFilePath">The path to the settings file.</param>
    /// <returns>The name of the project, or null if missing.</returns>
    private string? GetNameFromSettings(string settingsFilePath)
    {
        string contents = FileSystemService.FileReadText(settingsFilePath);
        XElement root = XElement.Parse(contents);
        XElement? nameElem = root.Element(nameof(Setting.Name));
        return string.IsNullOrEmpty(nameElem?.Value) ? null : nameElem.Value;
    }

    /// <summary>
    /// Gets the full path to the project.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>The full path to the project, or null if it does not exist.</returns>
    private string? GetProjectPath(string? projectId)
    {
        if (projectId is null)
            return null;
        string projectPath = Path.Join(_settingsDirectory, projectId, "target");
        return !FileSystemService.DirectoryExists(projectPath) ? null : projectPath;
    }

    /// <summary>
    /// Gets the path to the settings file.
    /// </summary>
    /// <param name="projectPath">The project path.</param>
    /// <returns>The path to the settings file, or null if missing.</returns>
    private string? GetSettingsFilePath(string projectPath)
    {
        string? settingsFile = Path.Join(projectPath, ProjectSettings.fileName);
        if (!FileSystemService.FileExists(settingsFile))
        {
            // If this is an older project (most likely a resource), there will be an SSF file
            settingsFile = FileSystemService.EnumerateFiles(projectPath, "*.ssf").FirstOrDefault();
        }

        return settingsFile;
    }

    /// <summary>
    /// Gets the versification type of the project from its Settings file.
    /// </summary>
    /// <param name="settingsFilePath">The path to the settings file.</param>
    /// <returns>The project versification type, without any customizations.</returns>
    private ScrVers GetVersificationFromSettings(string settingsFilePath)
    {
        string contents = FileSystemService.FileReadText(settingsFilePath);
        XElement root = XElement.Parse(contents);
        XElement? versificationElem = root.Element(nameof(Setting.Versification));
        if (
            string.IsNullOrEmpty(versificationElem?.Value)
            || !int.TryParse(versificationElem.Value, out int versification)
            || !Enum.IsDefined((ScrVersType)versification)
            || (ScrVersType)versification == ScrVersType.Unknown
        )
        {
            return ScrVers.English;
        }

        return new ScrVers((ScrVersType)versification);
    }

    /// <summary>
    /// Gets the base project ID of a derived translation (e.g. a back translation) from its Settings file.
    /// </summary>
    /// <param name="settingsFilePath">The path to the settings file.</param>
    /// <returns>The base project ID, or null if the project is not a derived translation.</returns>
    private HexId? GetBaseProjectIdFromSettings(string settingsFilePath)
    {
        string contents = FileSystemService.FileReadText(settingsFilePath);
        XElement root = XElement.Parse(contents);
        string? translationInfo = root.Element(nameof(Setting.TranslationInfo))?.Value;
        if (string.IsNullOrEmpty(translationInfo))
            translationInfo = root.Element(nameof(Setting.BaseTranslation))?.Value;

        // This is in the format "{project type}:{base project name}:{base project id}"
        string[] parts = translationInfo?.Split(':', 3) ?? [];
        if (parts.Length != 3 || string.IsNullOrEmpty(parts[1]) || !new Enum<ProjectType>(parts[0]).IsDerivedType())
            return null;
        return HexId.FromStrSafe(parts[2]);
    }

    /// <summary>
    /// Gets the ID of the project whose versification a project uses.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>
    /// The base project ID for a derived translation whose base project is present, otherwise the project ID.
    /// </returns>
    /// <remarks>Paratext uses the base project's versification for a derived translation.</remarks>
    private string GetVersificationProjectId(string projectId)
    {
        string? projectPath = GetProjectPath(projectId);
        string? settingsFile = projectPath is null ? null : GetSettingsFilePath(projectPath);
        if (
            settingsFile is not null
            && GetBaseProjectIdFromSettings(settingsFile) is HexId baseProjectId
            && GetProjectPath(baseProjectId.Id) is not null
        )
        {
            return baseProjectId.Id;
        }

        return projectId;
    }

    /// <summary>
    /// Gets the custom versification file of a project.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>The path and contents of the custom.vrs file, or null if the project does not have one.</returns>
    private (string Path, string Contents)? GetCustomVersification(string projectId)
    {
        string? projectPath = GetProjectPath(projectId);
        if (projectPath is null)
            return null;

        string customVersificationPath = Path.Join(projectPath, ParatextVersificationTable.customVersFilename);
        if (!FileSystemService.FileExists(customVersificationPath))
            return null;
        return (customVersificationPath, FileSystemService.FileReadText(customVersificationPath));
    }
}

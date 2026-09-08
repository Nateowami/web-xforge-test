using System;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using Paratext.Data;
using Paratext.Data.ProjectFileAccess;
using Paratext.Data.ProjectSettingsAccess;
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
        // Allow use of custom versification systems, including those of base projects
        Versification.Table.Implementation = new SFVersificationTable(this);
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
    /// Gets the path to the custom versification file that applies to a project.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>The path to the custom versification file, or null if there is not one.</returns>
    /// <remarks>
    /// A derived translation, such as a back translation, uses the versification of its base project,
    /// including that project's customizations.
    /// </remarks>
    internal string? GetCustomVersificationFilePath(string projectId)
    {
        string? customVersFilePath = GetProjectCustomVersificationFilePath(projectId);
        if (customVersFilePath is not null)
            return customVersFilePath;

        string? baseProjectId = GetBaseProjectId(projectId);
        return baseProjectId is null || baseProjectId == projectId
            ? null
            : GetProjectCustomVersificationFilePath(baseProjectId);
    }

    /// <summary>
    /// Gets the identifier of the project's base project.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>The base project's identifier, or null if this project is not a derived translation.</returns>
    private string? GetBaseProjectId(string projectId)
    {
        string? projectPath = GetProjectPath(projectId);
        string? settingsFilePath = projectPath is null ? null : GetSettingsFilePath(projectPath);
        if (settingsFilePath is null)
            return null;

        string contents = FileSystemService.FileReadText(settingsFilePath);
        XElement root = XElement.Parse(contents);
        XElement? translationInfoElem =
            root.Element(nameof(Setting.TranslationInfo)) ?? root.Element(nameof(Setting.BaseTranslation));

        // The translation information is in the form "<project type>:<base project name>:<base project id>"
        string[] translationInfo = (translationInfoElem?.Value ?? string.Empty).Split(':', 3);
        return translationInfo.Length == 3 && !string.IsNullOrEmpty(translationInfo[2]) ? translationInfo[2] : null;
    }

    /// <summary>
    /// Gets the path to a project's own custom versification file.
    /// </summary>
    /// <param name="projectId">The Paratext project identifier.</param>
    /// <returns>The path to the custom versification file, or null if the project does not have one.</returns>
    private string? GetProjectCustomVersificationFilePath(string projectId)
    {
        string? projectPath = GetProjectPath(projectId);
        if (projectPath is null)
            return null;

        string customVersFilePath = Path.Join(projectPath, ParatextVersificationTable.customVersFilename);
        return FileSystemService.FileExists(customVersFilePath) ? customVersFilePath : null;
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
    /// Gets the versification of the project from its Settings file.
    /// </summary>
    /// <param name="settingsFilePath">The path to the settings file.</param>
    /// <returns>The project versification.</returns>
    /// <remarks>
    /// Only the versification type is returned, as that is all the project settings can store. Any customizations
    /// are loaded by <see cref="SFVersificationTable"/> when the versification is read from the project settings.
    /// </remarks>
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
}

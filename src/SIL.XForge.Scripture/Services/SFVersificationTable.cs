using System;
using System.IO;
using Paratext.Data;
using SIL.Scripture;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// A versification table that loads the versification customizations of Scripture Forge projects.
/// </summary>
/// <param name="scrTextCollection">The Scripture Text collection the projects are retrieved from.</param>
/// <remarks>
/// <see cref="ParatextVersificationTable"/> can only load a project's custom versification file if the project is
/// registered with the ParatextData <c>ScrTextCollection</c>. Scripture Forge creates its
/// <see cref="Paratext.Data.ScrText"/> objects on demand, so no projects are ever registered, and any customizations
/// were silently discarded, leaving just the versification they are based on.
/// </remarks>
public class SFVersificationTable(LazyScrTextCollection scrTextCollection) : ParatextVersificationTable
{
    /// <summary> The character separating the base versification from the project id. </summary>
    private const char CustomVersificationSeparator = '-';

    private readonly object _syncObject = new();

    protected override Versification Get(string versName)
    {
        // Customized versifications are named "<base versification>-<project id>"
        string[] parts = versName.Split(CustomVersificationSeparator, 2);
        if (parts.Length == 2 && !Exists(versName))
        {
            lock (_syncObject)
            {
                if (!Exists(versName))
                {
                    LoadCustomVersification(versName, parts[0], parts[1]);
                }
            }
        }

        // If the customizations could not be loaded, the base class will fall back to the base versification
        return base.Get(versName);
    }

    /// <summary>
    /// Loads the customizations for a project's versification, if the project has any.
    /// </summary>
    /// <param name="versName">The name of the customized versification.</param>
    /// <param name="baseVersName">The name of the versification the customizations are based on.</param>
    /// <param name="projectId">The Paratext project identifier.</param>
    private void LoadCustomVersification(string versName, string baseVersName, string projectId)
    {
        string? path = scrTextCollection.GetCustomVersificationFilePath(projectId);
        if (path is null)
            return;

        // Paratext uses English if the base versification is unknown
        if (!Enum.TryParse(baseVersName, out ScrVersType baseVersType) || baseVersType == ScrVersType.Unknown)
        {
            baseVersType = ScrVersType.English;
        }

        using TextReader reader = new StringReader(scrTextCollection.FileSystemService.FileReadText(path));
        Load(reader, path, new ScrVers(baseVersType), versName);
    }
}

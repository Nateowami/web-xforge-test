using System;
using System.Collections.Generic;
using System.IO;
using Paratext.Data;
using SIL.Scripture;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// A versification table that loads the custom versification (custom.vrs) of projects in the Scripture Forge sync
/// directory.
/// </summary>
/// <remarks>
/// ParatextData requests a project's versification using the name "{versification type}-{project id}".
/// <see cref="ParatextVersificationTable"/> finds the custom.vrs for that project using
/// <see cref="ScrTextCollection.FindById"/>, but Scripture Forge does not add its projects to the
/// <see cref="ScrTextCollection"/>, so without this class the versification customizations are ignored.
/// </remarks>
/// <param name="getVersificationProjectId">
/// Gets the ID of the project whose versification a project uses, i.e. the base project of a derived translation.
/// </param>
/// <param name="getCustomVersification">
/// Gets the path and contents of a project's custom.vrs file, or <c>null</c> if there is none.
/// </param>
public class SFVersificationTable(
    Func<string, string> getVersificationProjectId,
    Func<string, (string Path, string Contents)?> getCustomVersification
) : ParatextVersificationTable
{
    private readonly object _syncObj = new object();

    /// <summary> The custom.vrs contents that each versification loaded by this class was created from. </summary>
    private readonly Dictionary<string, string> _loadedContents = [];

    protected override Versification Get(string versName)
    {
        string[] parts = versName.Split('-', 2);
        if (parts.Length != 2)
            return base.Get(versName);

        // Paratext gives a derived translation the base project's own versification, so that they are equal.
        string versificationProjectId = getVersificationProjectId(parts[1]);
        string ownerVersName = $"{parts[0]}-{versificationProjectId}";

        // The files are read outside the lock so that concurrent requests do not wait on each other's file access
        (string Path, string Contents)? customVersification = getCustomVersification(versificationProjectId);
        lock (_syncObj)
        {
            if (
                _loadedContents.TryGetValue(ownerVersName, out string? loadedContents)
                && loadedContents != customVersification?.Contents
            )
            {
                // The custom.vrs has changed or been removed by a sync since it was loaded. The table cannot replace
                // a single versification, so drop all custom versifications. They are reloaded when next requested.
                RemoveAllUnknownVersifications();
                _loadedContents.Clear();
            }

            if (customVersification is not null && !Exists(ownerVersName))
            {
                if (
                    !Enum.TryParse(parts[0], out ScrVersType type)
                    || !Enum.IsDefined(type)
                    || type == ScrVersType.Unknown
                )
                    type = ScrVersType.English;
                using var reader = new StringReader(customVersification.Value.Contents);
                Load(reader, customVersification.Value.Path, new ScrVers(type), ownerVersName);
                _loadedContents[ownerVersName] = customVersification.Value.Contents;
            }

            // If there is no custom versification, this falls back to the standard versification type
            return base.Get(ownerVersName);
        }
    }

    public override bool VersificationFileExists(string versName)
    {
        string[] parts = versName.Split('-', 2);
        if (parts.Length != 2)
            return base.VersificationFileExists(versName);

        // Like ParatextVersificationTable, this checks the named project's own custom.vrs
        return getCustomVersification(parts[1]) is not null || base.VersificationFileExists(versName);
    }
}

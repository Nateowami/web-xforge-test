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
/// <param name="getCustomVersification">
/// Gets the path and contents of the custom.vrs file to use for a project ID, or <c>null</c> if there is none.
/// </param>
public class SFVersificationTable(Func<string, (string Path, string Contents)?> getCustomVersification)
    : ParatextVersificationTable
{
    private readonly object _syncObj = new object();

    /// <summary> The custom.vrs contents that each versification loaded by this class was created from. </summary>
    private readonly Dictionary<string, string> _loadedContents = [];

    protected override Versification Get(string versName)
    {
        string[] parts = versName.Split('-', 2);
        if (parts.Length != 2)
            return base.Get(versName);

        lock (_syncObj)
        {
            (string Path, string Contents)? customVersification = getCustomVersification(parts[1]);
            if (
                _loadedContents.TryGetValue(versName, out string? loadedContents)
                && loadedContents != customVersification?.Contents
            )
            {
                // The custom.vrs has changed or been removed by a sync since it was loaded. The table cannot replace
                // a single versification, so drop all custom versifications. They are reloaded when next requested.
                RemoveAllUnknownVersifications();
                _loadedContents.Clear();
            }

            if (customVersification is not null && !Exists(versName))
            {
                if (
                    !Enum.TryParse(parts[0], out ScrVersType type)
                    || !Enum.IsDefined(type)
                    || type == ScrVersType.Unknown
                )
                    type = ScrVersType.English;
                using var reader = new StringReader(customVersification.Value.Contents);
                Load(reader, customVersification.Value.Path, new ScrVers(type), versName);
                _loadedContents[versName] = customVersification.Value.Contents;
            }

            // If there is no custom versification, this falls back to the standard versification type
            return base.Get(versName);
        }
    }
}

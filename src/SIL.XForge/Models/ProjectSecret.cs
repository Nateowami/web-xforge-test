using System.Collections.Generic;

namespace SIL.XForge.Models;

public abstract class ProjectSecret : IIdentifiable
{
    public string Id { get; set; } = null!;

    /// <summary>
    /// Outstanding project access shares to specific people, represented by an email address and code pair.
    /// </summary>
    public List<ShareKey> ShareKeys { get; set; } = [];
}

namespace SIL.XForge.Scripture.Models;

/// <summary>
/// The error codes for returning errors to front end via LastSyncErrorCode <see cref="Sync"/>.
/// </summary>
public enum SyncErrorCodes
{
    UserPermissionError = -1,

    /// <summary>
    /// The user could not authenticate to the Paratext Registry or Archives, such as when their Paratext refresh
    /// token has been revoked. The user will need to log out and log back in.
    /// </summary>
    ParatextAuthenticationError = -2,
}

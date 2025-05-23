using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using ICSharpCode.SharpZipLib.Zip;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Paratext.Data;
using Paratext.Data.Archiving;
using Paratext.Data.Languages;
using Paratext.Data.ProjectFileAccess;
using PtxUtils.Http;
using SIL.Extensions;
using SIL.IO;
using SIL.WritingSystems;
using SIL.XForge.Configuration;
using SIL.XForge.Models;
using SIL.XForge.Services;

namespace SIL.XForge.Scripture.Services;

/// <summary>
/// The Scripture Forge Installable DBL Resource Implementation.
/// </summary>
/// <remarks>
/// This is a reimplementation of <see cref="Paratext.Data.Archiving.InstallableDBLResource"/>.
/// Much of the code was copied from that class and modified to work within the ScriptureForge environment.
/// Primary differences include:
///  * Configuring the password provider based on the environment's <see cref="ParatextMigrationOperations"/>
///  * A simplified Migration Provider and Password Provider implementation
///  * Retrieving the Paratext Username from the JWT Token
///  * A resource permission implementation that uses the DBL API
///  * Use of the DBL API's JSON feed rather than the slower XML feed
///  * Reimplementing the logic in the internal class InstallableDBLResource.DBLParatextApi, using the JSON API
/// </remarks>
public class SFInstallableDblResource : InstallableResource
{
    /// <summary>
    /// The resource identifier length.
    /// </summary>
    public const int ResourceIdentifierLength = 16;

    /// <summary>
    /// The DBL folder name (in the zip file).
    /// </summary>
    private const string DblFolderName = ".dbl";

    /// <summary>
    /// The DBL resource entries API endpoint.
    /// </summary>
    private const string DblResourceEntriesApiCall = "api/resource_entries";

    /// <summary>
    /// The file system service.
    /// </summary>
    private readonly IFileSystemService _fileSystemService;

    /// <summary>
    /// The JWT token helper.
    /// </summary>
    private readonly IJwtTokenHelper _jwtTokenHelper;

    /// <summary>
    /// The paratext options.
    /// </summary>
    private readonly ParatextOptions _paratextOptions;

    /// <summary>
    /// The rest client factory.
    /// </summary>
    private readonly ISFRestClientFactory _restClientFactory;

    /// <summary>
    /// The scripture text collection.
    /// </summary>
    private readonly IScrTextCollection _scrTextCollection;

    /// <summary>
    /// The user secret.
    /// </summary>
    private readonly UserSecret _userSecret;

    /// <summary>
    /// The existing Scripture Text
    /// </summary>
    private ScrText? _existingScrText;

    /// <summary>
    /// Initializes a new instance of the <see cref="SFInstallableDblResource" /> class.
    /// </summary>
    /// <param name="userSecret">The user secret.</param>
    /// <param name="paratextOptions">The paratext options.</param>
    /// <param name="restClientFactory">The rest client factory.</param>
    /// <param name="fileSystemService">The file system service.</param>
    /// <param name="jwtTokenHelper">The JWT token helper.</param>
    /// <param name="scrTextCollection">The scripture text collection.</param>
    /// <param name="projectDeleter">The project deleter.</param>
    /// <param name="migrationOperations">The migration operations.</param>
    /// <param name="passwordProvider">The password provider.</param>
    /// <exception cref="ArgumentNullException">restClientFactory</exception>
    private SFInstallableDblResource(
        UserSecret userSecret,
        ParatextOptions paratextOptions,
        ISFRestClientFactory restClientFactory,
        IFileSystemService fileSystemService,
        IJwtTokenHelper jwtTokenHelper,
        IScrTextCollection scrTextCollection,
        IProjectDeleter projectDeleter,
        IMigrationOperations migrationOperations,
        IZippedResourcePasswordProvider passwordProvider
    )
        : base(projectDeleter, migrationOperations, passwordProvider)
    {
        this._userSecret = userSecret;
        this._paratextOptions = paratextOptions;
        this._restClientFactory = restClientFactory;
        this._fileSystemService = fileSystemService;
        this._jwtTokenHelper = jwtTokenHelper;
        this._scrTextCollection = scrTextCollection;
        if (this._restClientFactory == null)
        {
            throw new ArgumentNullException(nameof(restClientFactory));
        }
        else if (this._fileSystemService == null)
        {
            throw new ArgumentNullException(nameof(fileSystemService));
        }
    }

    /// <summary>
    /// Gets or sets the DBL source URL.
    /// </summary>
    /// <value>
    /// The DBL source URL.
    /// </value>
    /// <remarks>
    /// This URL may or may not require authentication, depending on the resource.
    /// </remarks>
    public string DblSourceUrl { get; set; }

    /// <summary>
    /// Gets the existing Scripture Text.
    /// </summary>
    /// <value>
    /// The existing Scripture Text.
    /// </value>
    /// <remarks>
    /// This is required for <see cref="InstallableResource.IsNewerThanCurrentlyInstalled" />.
    /// </remarks>
    public override ScrText? ExistingScrText
    {
        get
        {
            if (_existingScrText == null)
            {
                // First check the resources by ID directory
                string fileName = Name + "." + DBLEntryUid + ProjectFileManager.resourceFileExtension;
                string projectPath = Path.Join(SFScrTextCollection.ResourcesByIdDirectory, fileName);
                if (!_fileSystemService.FileExists(projectPath))
                {
                    // If that does not exist, use the resources directory
                    fileName = Name + ProjectFileManager.resourceFileExtension;
                    projectPath = Path.Join(ScrTextCollection.ResourcesDirectory, fileName);
                }

                // Generate an ExistingScrText from the p8z file on disk
                if (_fileSystemService.FileExists(projectPath))
                {
                    var name = new ProjectName(projectPath);
                    string userName =
                        _jwtTokenHelper.GetParatextUsername(_userSecret)
                        ?? throw new Exception($"Failed to get a PT username for SF user id {_userSecret.Id}.");
                    var passwordProvider = new ParatextZippedResourcePasswordProvider(_paratextOptions);
                    var resourceScrText = _scrTextCollection.CreateResourceScrText(userName, name, passwordProvider);
                    if (resourceScrText.Settings.DBLId == DBLEntryUid)
                    {
                        _existingScrText = resourceScrText;
                    }
                }
            }

            return _existingScrText;
        }
    }

    /// <summary>
    /// Checks the resource permission, according to a DBL server.
    /// </summary>
    /// <param name="id">The identifier.</param>
    /// <param name="userSecret">The user secret.</param>
    /// <param name="paratextOptions">The paratext options.</param>
    /// <param name="restClientFactory">The rest client factory.</param>
    /// <param name="fileSystemService">The file system service.</param>
    /// <param name="jwtTokenHelper">The JWT token helper.</param>
    /// <param name="scrTextCollection">The scripture text collection.</param>
    /// <param name="exceptionHandler">The exception handler.</param>
    /// <param name="baseUrl">The base URL.</param>
    /// <returns>
    ///   <c>true</c> if the user has permission to access the resource; otherwise, <c>false</c>.
    /// </returns>
    /// <exception cref="ArgumentNullException">id
    /// or
    /// userSecret
    /// or
    /// restClientFactory</exception>
    public static bool CheckResourcePermission(
        string id,
        UserSecret userSecret,
        ParatextOptions paratextOptions,
        ISFRestClientFactory restClientFactory,
        IFileSystemService fileSystemService,
        IJwtTokenHelper jwtTokenHelper,
        IScrTextCollection scrTextCollection,
        IExceptionHandler exceptionHandler,
        string baseUrl = null
    )
    {
        // Parameter check
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentNullException(nameof(id));
        }
        else if (userSecret == null)
        {
            throw new ArgumentNullException(nameof(userSecret));
        }
        else if (restClientFactory == null)
        {
            throw new ArgumentNullException(nameof(restClientFactory));
        }

        baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? InternetAccess.ParatextDBLServer : baseUrl;
        try
        {
            IEnumerable<SFInstallableDblResource> resources = GetInstallableDblResources(
                userSecret,
                paratextOptions,
                restClientFactory,
                fileSystemService,
                jwtTokenHelper,
                scrTextCollection,
                exceptionHandler,
                baseUrl,
                id
            );
            return resources.Any(r => r.DBLEntryUid.Id == id);
        }
        catch (Exception ex)
        {
            // Paratext throws an HttpException instead of a WebException
            // If you need it, the WebException is the InnerException
            if (ex is Paratext.Data.HttpException httpException)
            {
                if (httpException.Response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    // A 401 error means unauthorized (probably a bad token)
                    return false;
                }
                else if (httpException.Response.StatusCode == HttpStatusCode.Forbidden)
                {
                    // A 403 error means no access.
                    return false;
                }
                else if (httpException.Response.StatusCode == HttpStatusCode.NotFound)
                {
                    // A 404 error means that the resource is not on the server
                    return false;
                }
                else
                {
                    // Unknown status code
                    throw;
                }
            }
            else if (ex.Source == "NSubstitute")
            {
                // This occurs during unit tests to test whether there is permission or not
                return false;
            }
            else
            {
                // An unknown error
                throw;
            }
        }
    }

    /// <summary>
    /// Return a list of resources which this user is allowed to install from DBL.
    /// If we cannot contact DBL, return an empty list.
    /// </summary>
    /// <param name="userSecret">The user secret.</param>
    /// <param name="paratextOptions">The paratext options.</param>
    /// <param name="restClientFactory">The rest client factory.</param>
    /// <param name="fileSystemService">The file system service.</param>
    /// <param name="jwtTokenHelper">The JWT token helper.</param>
    /// <param name="scrTextCollection">The scripture text collection.</param>
    /// <param name="exceptionHandler">The exception handler.</param>
    /// <param name="baseUrl">The base URL.</param>
    /// <param name="id">ID of resource to filter for (optional).</param>
    /// <returns>The Installable Resources.</returns>
    /// <exception cref="ArgumentNullException">restClientFactory
    /// or
    /// userSecret</exception>
    /// <remarks>Tests on this method can be found in ParatextServiceTests.cs calling GetResources().</remarks>
    public static IEnumerable<SFInstallableDblResource> GetInstallableDblResources(
        UserSecret userSecret,
        ParatextOptions paratextOptions,
        ISFRestClientFactory restClientFactory,
        IFileSystemService fileSystemService,
        IJwtTokenHelper jwtTokenHelper,
        IScrTextCollection scrTextCollection,
        IExceptionHandler exceptionHandler,
        string baseUrl = null,
        string id = null
    )
    {
        // Parameter check (just like the constructor)
        if (restClientFactory == null)
        {
            throw new ArgumentNullException(nameof(restClientFactory));
        }
        else if (userSecret == null)
        {
            throw new ArgumentNullException(nameof(userSecret));
        }

        ISFRestClient client = restClientFactory.Create(string.Empty, userSecret);
        baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? InternetAccess.ParatextDBLServer : baseUrl;
        string response;
        try
        {
            response = client.Get(BuildDblResourceListUrl(baseUrl, id));
        }
        catch (WebException e)
        {
            // If we get a temporary 401 Unauthorized response, return an empty list.
            string errorExplanation =
                "GetInstallableDblResources failed when attempting to inquire about"
                + $" resources and is ignoring error {e}";
            var report = new Exception(errorExplanation);
            // Report to bugsnag, but don't throw.
            exceptionHandler.ReportException(report);
            return [];
        }
        IEnumerable<SFInstallableDblResource> resources = ConvertJsonResponseToInstallableDblResources(
            baseUrl,
            response,
            restClientFactory,
            fileSystemService,
            jwtTokenHelper,
            scrTextCollection,
            DateTime.Now,
            userSecret,
            paratextOptions,
            new ParatextProjectDeleter(),
            new ParatextMigrationOperations(),
            new ParatextZippedResourcePasswordProvider(paratextOptions)
        );
        return resources;
    }

    /// <summary>
    /// Extracts the resource to a directory.
    /// </summary>
    /// <param name="path">The path.</param>
    /// <exception cref="ArgumentNullException">
    /// path
    /// or
    /// DBLEntryUid
    /// or
    /// Name
    /// </exception>
    /// <remarks>
    /// After the resource is extracted, it can be a source or target.
    /// </remarks>
    public async Task ExtractToDirectoryAsync(string path)
    {
        // Check parameters
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new ArgumentNullException(nameof(path));
        }
        else if (string.IsNullOrWhiteSpace(DBLEntryUid.Id))
        {
            throw new ArgumentNullException(nameof(DBLEntryUid.Id));
        }
        else if (string.IsNullOrWhiteSpace(Name))
        {
            throw new ArgumentNullException(nameof(Name));
        }

        string resourceFile = ScrTextCollection.GetResourcePath(
            ExistingScrText,
            Name,
            DBLEntryUid,
            ProjectFileManager.resourceFileExtension
        );
        if (_fileSystemService.FileExists(resourceFile))
        {
            await using Stream stream = _fileSystemService.OpenFile(
                resourceFile,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read
            );
            using ZipFile zipFile = new ZipFile(stream);
            zipFile.Password = _passwordProvider?.GetPassword();
            await ExtractAllAsync(zipFile, path);
        }
    }

    private async Task ExtractAllAsync(ZipFile zip, string path)
    {
        foreach (ZipEntry entry in zip)
        {
            if (!entry.IsFile)
                continue; // Skip directories

            string entryPath = Path.Join(path, entry.Name);

            if (_fileSystemService.FileExists(entryPath))
                continue; // Don't overwrite

            // Ensure directories in the ZIP entry are created
            _fileSystemService.CreateDirectory(Path.GetDirectoryName(entryPath));

            // Extract the file
            await using Stream zipStream = zip.GetInputStream(entry);
            await using Stream output = _fileSystemService.CreateFile(entryPath);
            await zipStream.CopyToAsync(output);
        }
    }

    /// <summary>
    /// Download the files for this project from DBL into sourceDirectory and then
    /// copy them to the destination directory.
    /// Install should throw an Exception with an appropriate message if something goes wrong.
    /// </summary>
    /// <returns>
    ///   <c>true</c> if fonts were installed; otherwise <c>false</c>.
    /// </returns>
    /// <exception cref="ArgumentNullException">DBLEntryUid
    /// or
    /// DBLSourceUrl
    /// or
    /// Name</exception>
    public override bool Install()
    {
        // Easier to check parameters here than fill the temp directory with files
        // NOTE: This is not an exhaustive list of the required parameters!
        //       You will need to refer to InstallableResource.Install() for that.
        if (string.IsNullOrWhiteSpace(this.DBLEntryUid.Id))
        {
            throw new ArgumentNullException(nameof(this.DBLEntryUid.Id));
        }
        else if (string.IsNullOrWhiteSpace(this.DblSourceUrl))
        {
            throw new ArgumentNullException(nameof(this.DblSourceUrl));
        }
        else if (string.IsNullOrWhiteSpace(this.Name))
        {
            throw new ArgumentNullException(nameof(this.Name));
        }

        sourceDirectory = this.CreateTempSourceDirectory();
        string filePath = Path.Join(sourceDirectory, this.Name + ProjectFileManager.resourceFileExtension);
        if (!this.GetFile(filePath))
        {
            if (RobustFile.Exists(filePath))
            {
                RobustFile.Delete(filePath);
            }

            return false;
        }

        bool result;
        try
        {
            result = base.Install();
        }
        catch (UnauthorizedAccessException)
        {
            // Treat this like we couldn't get the resource from the DBL - ignore the error and continue.
            // This maybe caused by the file already being there and in use or the SF Project directory not existing
            result = false;
        }

        if (_fileSystemService.FileExists(filePath))
        {
            _fileSystemService.DeleteFile(filePath);
        }

        return result;
    }

    /// <summary>
    /// Gets the revision numbers for all installed resources.
    /// </summary>
    /// <returns>
    /// A dictionary where the resource id is the key, and the revision is the value.
    /// </returns>
    internal static async Task<IReadOnlyDictionary<string, int>> GetInstalledResourceRevisionsAsync()
    {
        // Initialize variables
        Dictionary<string, int> resourceRevisions = [];
        string resourcesDirectory;
        string resourcesByIdDirectory;

        // This can throw an error if the SettingsDirectory is not specified
        // If that is the case, we don't need to look at the FS anyway
        try
        {
            resourcesDirectory = ScrTextCollection.ResourcesDirectory;
            resourcesByIdDirectory = SFScrTextCollection.ResourcesByIdDirectory;
        }
        catch (ArgumentNullException)
        {
            // Path.Join() in ScrTextCollection will have thrown this error
            resourcesDirectory = string.Empty;
            resourcesByIdDirectory = string.Empty;
        }

        if (!string.IsNullOrWhiteSpace(resourcesDirectory) && Directory.Exists(resourcesDirectory))
        {
            const string resourceFilesPattern = $"*{ProjectFileManager.resourceFileExtension}";
            List<string> resourceFiles = [.. Directory.EnumerateFiles(resourcesDirectory, resourceFilesPattern)];
            if (Directory.Exists(resourcesByIdDirectory))
            {
                resourceFiles.AddRange(Directory.EnumerateFiles(resourcesByIdDirectory, resourceFilesPattern));
            }

            foreach (string resourceFile in resourceFiles)
            {
                // See if this a zip file, and if it contains the correct ID
                try
                {
                    await using var stream = new FileStream(
                        resourceFile,
                        FileMode.Open,
                        FileAccess.Read,
                        FileShare.Read
                    );
                    using var zipFile = new ZipFile(stream);
                    // Zip files use forward slashes, even on Windows
                    const string idSearchPath = DblFolderName + "/id/";
                    const string revisionSearchPath = DblFolderName + "/revision/";
                    // These are the values that will comprise the KeyValuePair
                    string fileId = null;
                    int revision = 0;
                    foreach (ZipEntry entry in zipFile)
                    {
                        if (
                            string.IsNullOrWhiteSpace(fileId)
                            && !entry.IsDirectory
                            && entry.Name.StartsWith(idSearchPath, StringComparison.OrdinalIgnoreCase)
                        )
                        {
                            fileId = entry.Name.Split('/', StringSplitOptions.RemoveEmptyEntries).Last();
                        }
                        else if (
                            revision == 0
                            && !entry.IsDirectory
                            && entry.Name.StartsWith(revisionSearchPath, StringComparison.OrdinalIgnoreCase)
                        )
                        {
                            string revisionFilename = entry
                                .Name.Split('/', StringSplitOptions.RemoveEmptyEntries)
                                .Last();
                            if (!int.TryParse(revisionFilename, out revision))
                            {
                                // An error occurred reading the revision
                                revision = 0;
                            }
                        }

                        // If we have both a revision id, and a file id, then add these to the dictionary
                        if (!string.IsNullOrWhiteSpace(fileId) && revision != 0)
                        {
                            break;
                        }
                    }

                    // If we have a file id
                    if (!string.IsNullOrWhiteSpace(fileId))
                    {
                        // Ensure we have a revision
                        if (revision == 0)
                        {
                            revision = 1;
                        }

                        // Add the file id and revision to the dictionary
                        resourceRevisions.TryAdd(fileId, revision);
                    }
                }
                catch (Exception)
                {
                    // If it is an erroneous zip file, we don't count it as a resource
                }
            }
        }

        return resourceRevisions.ToReadOnlyDictionary();
    }

    /// <summary>
    /// Get the URL for listing resources, or listing a single resource (getting metadata, not the resource itself).
    /// </summary>
    /// <param name="baseUri">The base URI.</param>
    /// <param name="entryUid">The entry unique identifier.</param>
    /// <returns>
    /// A URL to access the resource entries or specific entry if <paramref name="entryUid" /> is specified.
    /// </returns>
    private static string BuildDblResourceListUrl(string baseUri, string entryUid = null)
    {
        var uriBuilder = new UriBuilder(baseUri) { Path = DblResourceEntriesApiCall };
        if (!string.IsNullOrWhiteSpace(entryUid))
        {
            uriBuilder.Query = "id=" + entryUid;
        }
        return uriBuilder.Uri.AbsoluteUri;
    }

    /// <summary>
    /// Get the URL for fetching a resource.
    /// </summary>
    /// <param name="baseUri">The base URI.</param>
    /// <param name="entryUid">The entry unique identifier.</param>
    /// <returns>
    /// A URL to access the resource.
    /// </returns>
    private static string BuildDblResourceEntryUrl(string baseUri, string entryUid)
    {
        var uriBuilder = new UriBuilder(baseUri) { Path = DblResourceEntriesApiCall + "/" + entryUid };
        return uriBuilder.Uri.AbsoluteUri;
    }

    /// <summary>
    /// Creates the DBL URL with username query.
    /// </summary>
    /// <param name="resource">The resource.</param>
    /// <returns>
    /// The URL.
    /// </returns>
    private static string CreateDblUrlWithUsernameQuery(SFInstallableDblResource resource)
    {
        var uriBuilder = new UriBuilder(resource.DblSourceUrl);
        var query = HttpUtils.ParseQueryString(uriBuilder.Query);
        uriBuilder.Query = query.ToString();
        return uriBuilder.ToString();
    }

    /// <summary>
    /// Converts the JSON response to a list of Installable DBL Resources.
    /// </summary>
    /// <param name="baseUri">The base URI.</param>
    /// <param name="response">The response.</param>
    /// <param name="restClientFactory">The rest client factory.</param>
    /// <param name="fileSystemService">The file system service.</param>
    /// <param name="jwtTokenHelper">The JWT token helper.</param>
    /// <param name="scrTextCollection">The scripture text collection.</param>
    /// <param name="createdTimestamp">The created timestamp.</param>
    /// <param name="userSecret">The user secret.</param>
    /// <param name="paratextOptions">The paratext options.</param>
    /// <param name="projectDeleter">The project deleter.</param>
    /// <param name="migrationOperations">The migration operations.</param>
    /// <param name="passwordProvider">The password provider.</param>
    /// <returns>
    /// The Installable Resources.
    /// </returns>
    private static IEnumerable<SFInstallableDblResource> ConvertJsonResponseToInstallableDblResources(
        string baseUri,
        string response,
        ISFRestClientFactory restClientFactory,
        IFileSystemService fileSystemService,
        IJwtTokenHelper jwtTokenHelper,
        IScrTextCollection scrTextCollection,
        DateTime createdTimestamp,
        UserSecret userSecret,
        ParatextOptions paratextOptions,
        IProjectDeleter projectDeleter,
        IMigrationOperations migrationOperations,
        IZippedResourcePasswordProvider passwordProvider
    )
    {
        if (!string.IsNullOrWhiteSpace(response))
        {
            JObject jsonResources;
            try
            {
                jsonResources = JObject.Parse(response);
            }
            catch (JsonReaderException)
            {
                // Ignore the exception and just return empty result
                // This is probably caused by partial result from poor connection to DBL
                yield break;
            }
            foreach (JToken jsonResource in jsonResources["resources"] as JArray ?? [])
            {
                var name = (string)jsonResource["name"];
                var nameCommon = (string)jsonResource["nameCommon"];
                var fullname = (string)jsonResource["fullname"];
                if (string.IsNullOrWhiteSpace(fullname))
                {
                    fullname = nameCommon;
                }

                var languageName = (string)jsonResource["languageName"];
                var id = (string)jsonResource["id"];
                var revision = (string)jsonResource["revision"];
                var permissionsChecksum = (string)jsonResource["permissions-checksum"];
                var manifestChecksum = (string)jsonResource["p8z-manifest-checksum"];
                var languageIdLdml = (string)jsonResource["languageLDMLId"];
                var languageIdCode = (string)jsonResource["languageCode"];
                LanguageId languageId = migrationOperations.DetermineBestLangIdToUseForResource(
                    languageIdLdml,
                    languageIdCode
                );
                if (string.IsNullOrEmpty(languageId.Id))
                {
                    languageId = LanguageIdHelper.FromCommonLanguageName(languageName);
                }
                else
                {
                    languageId = LanguageId.FromEthnologueCode(languageId.Id);
                }

                string url = BuildDblResourceEntryUrl(baseUri, id);
                var resource = new SFInstallableDblResource(
                    userSecret,
                    paratextOptions,
                    restClientFactory,
                    fileSystemService,
                    jwtTokenHelper,
                    scrTextCollection,
                    projectDeleter,
                    migrationOperations,
                    passwordProvider
                )
                {
                    DisplayName = name,
                    Name = name,
                    FullName = fullname,
                    LanguageID = languageId,
                    DblSourceUrl = url,
                    DBLEntryUid = HexId.FromStr(id),
                    DBLRevision = int.Parse(revision),
                    PermissionsChecksum = permissionsChecksum,
                    ManifestChecksum = manifestChecksum,
                    CreatedTimestamp = createdTimestamp,
                };

                resource.LanguageName = MacroLanguageHelper.GetMacroLanguage(resource.LanguageID) ?? languageName;

                yield return resource;
            }
        }
    }

    /// <summary>
    /// Creates the temporary source directory.
    /// </summary>
    /// <returns>
    /// The temporary directory path.
    /// </returns>
    private string CreateTempSourceDirectory()
    {
        string dirName = Path.Join(temporaryDirectoryName, Name + '_' + Path.GetRandomFileName());

        // This following is an implementation of Paratext.Data.FileUtils.GetTemporaryDirectory(dirName)
        string path = Path.Join(Path.GetTempPath(), dirName);
        if (!Directory.Exists(path))
        {
            // If we don't have the file system service, just ignore
            this._fileSystemService?.CreateDirectory(path);
        }

        return path;
    }

    /// <summary>
    /// Gets the file from DBL.
    /// </summary>
    /// <param name="filePath">The file path.</param>
    /// <returns>
    ///   <c>true</c>  if the file was retrieved successfully; otherwise, <c>false</c>.
    /// </returns>
    private bool GetFile(string filePath)
    {
        ISFRestClient client = this._restClientFactory.Create(string.Empty, this._userSecret);
        string dblUrlToResource = CreateDblUrlWithUsernameQuery(this);
        return client.GetFile(dblUrlToResource, filePath);
    }

    /// <summary>
    /// An empty Paratext project deleter implementation.
    /// </summary>
    /// <seealso cref="Paratext.Data.Archiving.IProjectDeleter" />
    private class ParatextProjectDeleter : IProjectDeleter
    {
        /// <inheritdoc />
        public void DeleteProject(ScrText scrText) =>
            throw new NotImplementedException("This method should not be used in SF context.");
    }

    /// <summary>
    /// An empty Paratext migration options implementation.
    /// </summary>
    /// <seealso cref="Paratext.Data.Archiving.IMigrationOperations" />
    private class ParatextMigrationOperations : IMigrationOperations
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ParatextMigrationOperations"/> class.
        /// </summary>
        public ParatextMigrationOperations()
        {
            if (!Sldr.IsInitialized)
            {
                // Always use offline mode in tests
                Sldr.Initialize(true);
            }
        }

        /// <inheritdoc />
        public UnsupportedReason MigrateProjectIfNeeded(ScrText scrText) => UnsupportedReason.Supported;

        /// <inheritdoc />
        public LanguageId DetermineBestLangIdToUseForResource(string languageIdLdml, string languageIdDbl)
        {
            LanguageId langIdDbl = LanguageId.FromEthnologueCode(languageIdDbl);
            if (string.IsNullOrEmpty(languageIdLdml))
            {
                return langIdDbl;
            }

            LanguageId langIdLdml = LanguageId.FromEthnologueCode(languageIdLdml);
            if (langIdLdml.Code == langIdDbl.Code)
            {
                return langIdLdml;
            }
            else
            {
                return langIdDbl;
            }
        }
    }
}

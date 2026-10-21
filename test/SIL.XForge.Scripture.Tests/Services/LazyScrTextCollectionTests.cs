using System.IO;
using NSubstitute;
using NSubstitute.Extensions;
using NUnit.Framework;
using Paratext.Data;
using Paratext.Data.ProjectSettingsAccess;
using SIL.Scripture;
using SIL.XForge.Scripture.Models;
using SIL.XForge.Services;

namespace SIL.XForge.Scripture.Services;

[TestFixture]
public class LazyScrTextCollectionTests
{
    private readonly HexId _project01 = HexId.CreateNew();
    private readonly HexId _project02 = HexId.CreateNew();
    private const string User01 = "user01";
    private const string Project01Name = "Proj01";
    private const string Project02Name = "Proj02";

    [Test]
    public void FindById_BaseProject_Missing()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name
        );

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText, Is.Not.Null);
        Assert.That(scrText?.Name, Is.EqualTo(Project01Name));
        Assert.That(scrText?.Directory, Is.EqualTo(path));
        env.FileSystemService.Received(1)
            .DirectoryExists(Arg.Is<string>(s => s.EndsWith(Path.Join(_project02.Id, "target"))));
    }

    [Test]
    public void FindById_BaseProject_NoSettings()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name
        );
        string basePath = env.ConfigureProject(User01, _project02, Project02Name, SettingsFormat.None);

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText, Is.Not.Null);
        Assert.That(scrText?.Name, Is.EqualTo(Project01Name));
        Assert.That(scrText?.Directory, Is.EqualTo(path));
        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
        env.FileSystemService.Received(1).FileExists(Path.Join(basePath, ProjectSettings.fileName));
    }

    [Test]
    public void FindById_BaseProject_UsesBaseVersification()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name
        );
        string basePath = env.ConfigureProject(
            User01,
            _project02,
            Project02Name,
            SettingsFormat.Paratext8,
            ScrVers.Vulgate
        );

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText, Is.Not.Null);
        Assert.That(scrText?.Name, Is.EqualTo(Project01Name));
        Assert.That(scrText?.Directory, Is.EqualTo(path));
        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
        env.FileSystemService.Received(1).FileExists(Path.Join(basePath, ProjectSettings.fileName));
        Assert.That(scrText?.Settings.Versification.Type, Is.EqualTo(ScrVers.Vulgate.Type));
    }

    [Test]
    public void FindById_BaseProject_UsesBaseCustomVersification()
    {
        // Setup
        var env = new TestEnvironment();
        env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name,
            customVersification: TestEnvironment.CustomVersificationWithTwoMalachiChapters
        );
        env.ConfigureProject(
            User01,
            _project02,
            Project02Name,
            SettingsFormat.Paratext8,
            ScrVers.Vulgate,
            customVersification: TestEnvironment.CustomVersificationWithOneJohnChapter
        );

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        // The base project's customizations are used, not the derived project's
        ScrVers versification = scrText!.Settings.Versification;
        Assert.That(versification.IsCustomized, Is.True);
        Assert.That(versification.BaseVersification.Type, Is.EqualTo(ScrVersType.Vulgate));
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("JHN")), Is.EqualTo(1));
        Assert.That(
            versification.GetLastChapter(Canon.BookIdToNumber("MAL")),
            Is.EqualTo(ScrVers.Vulgate.GetLastChapter(Canon.BookIdToNumber("MAL")))
        );

        // Like Paratext, the back translation shares the base project's versification
        ScrVers baseVersification = env.Service.FindById(User01, _project02.Id)!.Settings.Versification;
        Assert.That(versification.Name, Is.EqualTo($"{ScrVersType.Vulgate}-{_project02.Id}"));
        Assert.That(versification, Is.EqualTo(baseVersification));
    }

    [Test]
    public void FindById_BaseProject_UsesBaseCustomVersificationWithLegacyBaseTranslationSetting()
    {
        // Setup
        var env = new TestEnvironment();
        env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name,
            useLegacyBaseTranslationSetting: true
        );
        env.ConfigureProject(
            User01,
            _project02,
            Project02Name,
            SettingsFormat.Paratext8,
            ScrVers.Vulgate,
            customVersification: TestEnvironment.CustomVersificationWithOneJohnChapter
        );

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText!.Settings.Versification.GetLastChapter(Canon.BookIdToNumber("JHN")), Is.EqualTo(1));
    }

    [Test]
    public void FindById_BaseProject_CustomVersificationReloadedWhenBaseChanged()
    {
        // Setup
        var env = new TestEnvironment();
        env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            baseProjectId: _project02,
            baseProjectName: Project02Name
        );
        string basePath = env.ConfigureProject(
            User01,
            _project02,
            Project02Name,
            SettingsFormat.Paratext8,
            ScrVers.English,
            customVersification: TestEnvironment.CustomVersificationWithOneJohnChapter
        );
        Assert.That(
            env.Service.FindById(User01, _project01.Id)!
                .Settings.Versification.GetLastChapter(Canon.BookIdToNumber("JHN")),
            Is.EqualTo(1)
        );

        // Simulate a sync of the base project changing, then removing, its custom versification
        string customVersificationPath = Path.Join(basePath, ParatextVersificationTable.customVersFilename);
        env.FileSystemService.FileReadText(customVersificationPath)
            .Returns(TestEnvironment.CustomVersificationWithTwoMalachiChapters);
        ScrVers versification = env.Service.FindById(User01, _project01.Id)!.Settings.Versification;
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("JHN")), Is.EqualTo(21));
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("MAL")), Is.EqualTo(2));

        env.FileSystemService.FileExists(customVersificationPath).Returns(false);
        versification = env.Service.FindById(User01, _project01.Id)!.Settings.Versification;
        Assert.That(versification.IsCustomized, Is.False);
        Assert.That(versification.Type, Is.EqualTo(ScrVersType.English));
    }

    [Test]
    public void FindById_CustomVersification()
    {
        // Setup
        var env = new TestEnvironment();
        env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            ScrVers.Original,
            customVersification: TestEnvironment.CustomVersificationWithOneJohnChapter
        );

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        ScrVers versification = scrText!.Settings.Versification;
        Assert.That(versification.IsCustomized, Is.True);
        Assert.That(versification.BaseVersification.Type, Is.EqualTo(ScrVersType.Original));
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("JHN")), Is.EqualTo(1));
        Assert.That(Versification.Table.Implementation.VersificationFileExists(versification.Name), Is.True);
    }

    [Test]
    public void FindById_CustomVersification_ReloadedWhenChanged()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(
            User01,
            _project01,
            Project01Name,
            SettingsFormat.Paratext8,
            ScrVers.English,
            customVersification: TestEnvironment.CustomVersificationWithOneJohnChapter
        );
        Assert.That(
            env.Service.FindById(User01, _project01.Id)!
                .Settings.Versification.GetLastChapter(Canon.BookIdToNumber("JHN")),
            Is.EqualTo(1)
        );

        // Simulate a sync changing, then removing, the custom versification
        string customVersificationPath = Path.Join(path, ParatextVersificationTable.customVersFilename);
        env.FileSystemService.FileReadText(customVersificationPath)
            .Returns(TestEnvironment.CustomVersificationWithTwoMalachiChapters);
        ScrVers versification = env.Service.FindById(User01, _project01.Id)!.Settings.Versification;
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("JHN")), Is.EqualTo(21));
        Assert.That(versification.GetLastChapter(Canon.BookIdToNumber("MAL")), Is.EqualTo(2));

        env.FileSystemService.FileExists(customVersificationPath).Returns(false);
        versification = env.Service.FindById(User01, _project01.Id)!.Settings.Versification;
        Assert.That(versification.IsCustomized, Is.False);
        Assert.That(versification.Type, Is.EqualTo(ScrVersType.English));
    }

    [Test]
    public void FindById_DoesNotExist_ReturnsNull()
    {
        // Setup
        var env = new TestEnvironment();

        // SUT
        Assert.That(env.Service.FindById(User01, "projectDoesNotExist"), Is.Null);
    }

    [Test]
    public void FindById_EmptyName_ReturnsNull()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(User01, _project01, string.Empty, SettingsFormat.Paratext8);

        // SUT
        Assert.That(env.Service.FindById(User01, _project01.Id), Is.Null);

        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
    }

    [Test]
    public void FindById_NoSettings_ReturnsNull()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(User01, _project01, Project01Name, SettingsFormat.None);

        // SUT
        Assert.That(env.Service.FindById(User01, _project01.Id), Is.Null);

        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
        env.FileSystemService.Received(1).EnumerateFiles(path, "*.ssf");
    }

    [Test]
    public void FindById_NullProjectId_ReturnsNull()
    {
        // Setup
        var env = new TestEnvironment();

        // SUT
        Assert.That(env.Service.FindById(User01, null), Is.Null);
    }

    [Test]
    public void FindById_Paratext8_ReturnsProject()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(User01, _project01, Project01Name, SettingsFormat.Paratext8);

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText, Is.Not.Null);
        Assert.That(scrText?.Name, Is.EqualTo(Project01Name));
        Assert.That(scrText?.Directory, Is.EqualTo(path));
        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
    }

    [Test]
    public void FindById_Paratext7_ReturnsProject()
    {
        // Setup
        var env = new TestEnvironment();
        string path = env.ConfigureProject(User01, _project01, Project01Name, SettingsFormat.Paratext7);

        // SUT
        ScrText? scrText = env.Service.FindById(User01, _project01.Id);

        Assert.That(scrText, Is.Not.Null);
        Assert.That(scrText?.Name, Is.EqualTo(Project01Name));
        Assert.That(scrText?.Directory, Is.EqualTo(path));
        env.FileSystemService.Received(1).FileExists(Path.Join(path, ProjectSettings.fileName));
        env.FileSystemService.Received(1).EnumerateFiles(path, "*.ssf");
    }

    private class TestEnvironment
    {
        private readonly string _testDirectory;

        public const string CustomVersificationWithOneJohnChapter = "JHN 1:51 END\n";
        public const string CustomVersificationWithTwoMalachiChapters = "MAL 1:14 2:17 END\n";

        public TestEnvironment()
        {
            _testDirectory = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
            FileSystemService = Substitute.For<IFileSystemService>();

            Service = Substitute.ForPartsOf<LazyScrTextCollection>();
            Service.Initialize(_testDirectory);
            Service.FileSystemService = FileSystemService;
        }

        public IFileSystemService FileSystemService { get; }
        public LazyScrTextCollection Service { get; }

        /// <summary>
        /// Configures a project for the text
        /// </summary>
        /// <param name="userId">The Paratext user identifier.</param>
        /// <param name="projectId">The Paratext project identifier.</param>
        /// <param name="projectName">The project name.</param>
        /// <param name="settingsFormat">The Paratext Settings file format</param>
        /// <param name="scrVers">Optional. The project versification.</param>
        /// <param name="baseProjectId">Optional. The base project identifier.</param>
        /// <param name="baseProjectName">Optional. The base project name.</param>
        /// <param name="customVersification">Optional. The contents of the project's custom.vrs file.</param>
        /// <param name="useLegacyBaseTranslationSetting">
        /// Optional. Write the base project to the legacy BaseTranslation setting, with an empty TranslationInfo.
        /// </param>
        /// <returns>
        /// The path to the project.
        /// </returns>
        public string ConfigureProject(
            string userId,
            HexId projectId,
            string projectName,
            SettingsFormat settingsFormat,
            ScrVers? scrVers = null,
            HexId? baseProjectId = null,
            string baseProjectName = "",
            string? customVersification = null,
            bool useLegacyBaseTranslationSetting = false
        )
        {
            // Configure the project "on disk"
            string projectPath = Path.Join(_testDirectory, projectId.Id);
            string targetPath = Path.Join(projectPath, "target");
            string versification = scrVers is null
                ? string.Empty
                : $"<Versification>{(int)scrVers.Type}</Versification>";
            string translationInfo =
                baseProjectId is null ? string.Empty
                : useLegacyBaseTranslationSetting
                    ? $"<TranslationInfo></TranslationInfo><BaseTranslation>BackTranslation:{baseProjectName}:{baseProjectId.Id}</BaseTranslation>"
                : $"<TranslationInfo>BackTranslation:{baseProjectName}:{baseProjectId.Id}</TranslationInfo>";
            string content =
                $"<ScriptureText><Name>{projectName}</Name><Guid>{projectId.Id}</Guid>{versification}{translationInfo}</ScriptureText>";
            FileSystemService
                .FileReadText(Arg.Is<string>(s => !string.IsNullOrEmpty(s) && s.StartsWith(targetPath)))
                .Returns(content);
            if (customVersification is not null)
            {
                string customVersificationPath = Path.Join(targetPath, ParatextVersificationTable.customVersFilename);
                FileSystemService.FileExists(customVersificationPath).Returns(true);
                FileSystemService.FileReadText(customVersificationPath).Returns(customVersification);
            }
            FileSystemService
                .DirectoryExists(Arg.Is<string>(s => !string.IsNullOrEmpty(s) && s.StartsWith(projectPath)))
                .Returns(true);
            switch (settingsFormat)
            {
                case SettingsFormat.Paratext7:
                    FileSystemService
                        .EnumerateFiles(targetPath, "*.ssf")
                        .Returns([Path.Join(targetPath, $"{projectName}.ssf")]);
                    break;
                case SettingsFormat.Paratext8:
                    FileSystemService.FileExists(Path.Join(targetPath, ProjectSettings.fileName)).Returns(true);
                    break;
                case SettingsFormat.None:
                default:
                    // No settings file present
                    break;
            }

            // Configure the service to return the scripture text. A new one is created each time, like ScrText.
            Service
                .Configure()
                .CreateScrText(Arg.Any<string>(), Arg.Is<ProjectName>(p => p.ShortName == projectName))
                .Returns(_ =>
                {
                    var scrText = new MockScrText(
                        new SFParatextUser(userId),
                        new ProjectName { ProjectPath = targetPath, ShortName = projectName }
                    )
                    {
                        CachedGuid = projectId,
                    };
                    if (scrVers is not null)
                        scrText.Settings.Versification = scrVers;
                    if (baseProjectId is not null)
                    {
                        scrText.Settings.TranslationInfo = new TranslationInformation(
                            ProjectType.BackTranslation,
                            baseProjectName,
                            baseProjectId
                        );
                    }
                    return scrText;
                });

            return targetPath;
        }
    }

    private enum SettingsFormat
    {
        None,
        Paratext7,
        Paratext8,
    }
}

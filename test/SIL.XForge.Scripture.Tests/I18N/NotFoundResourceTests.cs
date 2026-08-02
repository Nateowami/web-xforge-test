using System.Globalization;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;

namespace SIL.XForge.Scripture.I18N;

[TestFixture]
public class NotFoundResourceTests
{
    /// <summary>
    ///     The back end 404 page (Pages/Status/_404.cshtml) is the only user facing page that uses the Pages.NotFound
    ///     resource. For years it only had an English .resx, so the page stayed in English no matter what interface
    ///     language the user had chosen. Verify that the translations are still present.
    /// </summary>
    [TestCase("es")]
    [TestCase("ar")]
    public void PageNotFound_IsTranslated(string culture)
    {
        var options = Options.Create(new LocalizationOptions { ResourcesPath = "Resources" });
        var factory = new ResourceManagerStringLocalizerFactory(options, NullLoggerFactory.Instance);
        IStringLocalizer localizer = factory.Create("Pages.NotFound", "SIL.XForge.Scripture");

        LocalizedString english = localizer.GetString("PageNotFound");
        Assert.IsFalse(english.ResourceNotFound, "Missing English string for PageNotFound");

        using (new CultureScope(culture))
        {
            LocalizedString translated = localizer.GetString("PageNotFound");
            Assert.IsFalse(translated.ResourceNotFound, $"Missing {culture} resource for PageNotFound");
            Assert.AreNotEqual(
                english.Value,
                translated.Value,
                $"PageNotFound is not translated into {culture} (Resources/Pages.NotFound.{culture}.resx)"
            );
        }
    }

    private sealed class CultureScope : System.IDisposable
    {
        private readonly CultureInfo _previousUICulture = CultureInfo.CurrentUICulture;

        public CultureScope(string culture) => CultureInfo.CurrentUICulture = new CultureInfo(culture);

        public void Dispose() => CultureInfo.CurrentUICulture = _previousUICulture;
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SIL.XForge.Scripture.Pages.Status;

/// <summary>
/// Provides a page for displaying error messages.
/// </summary>
/// <remarks>
/// To prevent 400 errors when APIs return errors during a POST, this page does not require an anti-forgery token.
/// This is because this page is called via UseStatusCodePagesWithReExecute() from Startup.cs.
/// </remarks>
[IgnoreAntiforgeryToken]
public class ErrorModel : PageModel
{
    public int ErrorStatusCode { get; private set; }
    public bool RedirectToHome => ErrorStatusCode == 404;
    public string SiteOrigin => $"{Request.Scheme}://{Request.Host}";

    public void OnGet(int code) => ErrorStatusCode = code;
}

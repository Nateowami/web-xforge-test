using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using SIL.XForge.Models;

namespace SIL.XForge.Scripture;

/// <summary>
/// This class holds the Keys for looking up localizable strings in the IStringLocalizer.
/// It also provides the class which IStringLocalizer uses to find the .resx files with the strings
/// Every string in the Keys class here should also be present in the Resources\SharedResource.en.resx
/// with the english translation as the value.
/// </summary>
[ExcludeFromCodeCoverage(Justification = "The static methods in this class access the file system")]
public class SharedResource
{
    public static class Keys
    {
        public const string AudioOnlyQuestion = "AudioOnlyQuestion";
        public const string AudioOnlyResponse = "AudioOnlyResponse";
        public const string CommunitySupport = "CommunitySupport";
        public const string EmailBad = "EmailBad";
        public const string EmailMissing = "EmailMissing";
        public const string Help = "Help";
        public const string InviteEmailOption = "InviteEmailOption";
        public const string InviteFacebookOption = "InviteFacebookOption";
        public const string InviteGoogleOption = "InviteGoogleOption";
        public const string InviteGreeting = "InviteGreeting";
        public const string InviteInstructions = "InviteInstructions";
        public const string InviteLinkExpires = "InviteLinkExpires";
        public const string InvitePTOption = "InvitePTOption";
        public const string InviteSignature = "InviteSignature";
        public const string InviteSubject = "InviteSubject";
        public const string Language = "Language";
        public const string LearnMore = "LearnMore";
        public const string LogIn = "LogIn";
        public const string MessageMissing = "MessageMissing";
        public const string NameMissing = "NameMissing";
        public const string Privacy = "Privacy";
        public const string RoleMissing = "RoleMissing";
        public const string SignUp = "SignUp";
        public const string Terms = "Terms";
        public const string UserMissing = "UserMissing";
    }

    /// <summary>
    /// Map of culture identifier (language tag) to interface language object (local name displayed in the chooser)
    /// </summary>
    public static readonly Dictionary<string, InterfaceLanguage> Cultures = JsonConvert
        .DeserializeObject<List<InterfaceLanguage>>(File.ReadAllText("locales.json"))
        .ToDictionary(culture => culture.CanonicalTag);
}

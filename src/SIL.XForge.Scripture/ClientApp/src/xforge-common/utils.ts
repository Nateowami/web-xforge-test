import { translate } from '@ngneat/transloco';
import Bowser from 'bowser';
import ObjectID from 'bson-objectid';
import locales from '../../../locales.json';
import versionData from '../../../version.json';
import { environment } from '../environments/environment';
import { Locale } from './models/i18n-locale';

const BROWSER = Bowser.getParser(window.navigator.userAgent);

/** The subset of the User-Agent Client Hints API used here. It is only available in Chromium-based browsers. */
export interface UserAgentHighEntropyValues {
  platformVersion?: string;
  fullVersionList?: { brand: string; version: string }[];
}

// Chromium freezes parts of the user agent string (e.g. "Android 10", "Chrome/155.0.0.0", "Windows NT 10.0"), so the
// real OS and browser versions are only available from the async client hints API. Request them as soon as the app
// loads so they are available synchronously by the time an issue email link is generated.
let userAgentHighEntropyValues: UserAgentHighEntropyValues | undefined;
(
  window.navigator as Navigator & {
    userAgentData?: { getHighEntropyValues(hints: string[]): Promise<UserAgentHighEntropyValues> };
  }
).userAgentData
  ?.getHighEntropyValues(['platformVersion', 'fullVersionList'])
  .then(values => (userAgentHighEntropyValues = values))
  .catch(() => {});

export function nameof<T>(name: Extract<keyof T, string>): string {
  return name;
}

/**
 * Returns a valid 24 character `ObjectID` hex string.
 */
export function objectId(): string {
  return new ObjectID().toHexString();
}

export function supportedBrowser(): boolean {
  // Minimum required versions are based largely on browser support data for the following features:
  // https://caniuse.com/indexeddb2
  // https://caniuse.com/mdn-javascript_builtins_regexp_property_escapes
  // https://caniuse.com/mdn-css_properties_text-align_flow_relative_values_start_and_end
  // https://caniuse.com/mdn-css_properties_column-gap_flex_context
  // https://caniuse.com/mdn-css_properties_inset-inline-start
  // https://developer.mozilla.org/en-US/docs/Web/CSS/margin-inline-start#browser_compatibility
  // ES2022 (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks)
  const isSupportedBrowser: boolean =
    BROWSER.satisfies({
      chrome: '>=94',
      chromium: '>=94',
      edge: '>=94',
      firefox: '>=93',
      safari: '>=16.4',

      mobile: {
        chrome: '>=94',
        firefox: '>=93',
        opera: '>=80',
        safari: '>=16.4',
        'android browser': '>=94',
        'samsung internet': '>=17.0'
      }
    }) ?? false;
  // Brave's user agent string is not correctly read by bowser.
  // Brave on iOS requires iOS 16 or higher
  return isSupportedBrowser || (isIosDevice() && isBrave());
}

export function isIosDevice(): boolean {
  return BROWSER.getOSName(true) === 'ios';
}

export function isBrave(): boolean {
  // The officially supported way of detecting Brave is to call navigator.brave.isBrave(), which returns
  // Promise<boolean>. See https://github.com/brave/brave-browser/wiki/Detecting-Brave-(for-Websites)
  // Just checking for the presence of this property works fine though and doesn't require awaiting a promise.
  return 'brave' in window.navigator;
}

export function getBrowserEngine(): string {
  const engine = BROWSER.getEngine().name;
  return engine == null ? '' : engine.toLowerCase();
}

export function isBlink(): boolean {
  return getBrowserEngine() === 'blink';
}

export function isGecko(): boolean {
  return getBrowserEngine() === 'gecko';
}

export function isSafari(): boolean {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
}

export function audioRecordingMimeType(): string {
  // MediaRecorder.isTypeSupported('audio/webm') will erroneously return true on Firefox,
  // and so we must use browser sniffing in this case.
  if (isGecko()) {
    // If OGG is not used on Firefox, recording does not work correctly.
    // See https://github.com/muaz-khan/RecordRTC/issues/166#issuecomment-242942400
    return 'audio/ogg';
  } else if (MediaRecorder.isTypeSupported('audio/webm')) {
    // This is the default format for Chromium based browsers
    return 'audio/webm';
  } else {
    // Safari on iOS/macOS does not support audio/webm
    return 'audio/mp4';
  }
}

/**
 * Gets the browser name and version, and the OS name followed by its version when known (e.g. "Android 14.0.0", or
 * just "Linux"), to include in an issue report. Values from the User-Agent Client Hints API are preferred over the user
 * agent string, as Chromium-based browsers report frozen values in the latter.
 */
export function getBrowserAndOsInfo(
  userAgent: string,
  highEntropyValues?: UserAgentHighEntropyValues
): { browserName: string; browserVersion: string | undefined; os: string | undefined } {
  const bowser = Bowser.getParser(userAgent);
  const browserName: string = bowser.getBrowserName();
  const osName: string = bowser.getOSName();

  // The brands are e.g. "Google Chrome" or "Microsoft Edge", alongside "Chromium" and a meaningless "Not-A.Brand"
  const browserVersion: string | undefined =
    highEntropyValues?.fullVersionList?.find(b => browserName !== '' && b.brand.includes(browserName))?.version ??
    bowser.getBrowserVersion();

  let osVersion: string | undefined = bowser.getOSVersion();
  const platformVersion: string | undefined = highEntropyValues?.platformVersion;
  // Browsers do not expose the Linux distribution or version. Chromium sends an empty platform version on Linux, but
  // ignore it in case a browser sends something else, such as the kernel version.
  if (platformVersion != null && platformVersion !== '' && osName !== 'Linux') {
    if (osName === 'Windows') {
      // On Windows the platform version is the Windows.Foundation.UniversalApiContract version, not the OS version.
      // See https://learn.microsoft.com/en-us/microsoft-edge/web-platform/how-to-detect-win11
      const majorVersion: number = parseInt(platformVersion);
      if (majorVersion >= 13) osVersion = '11';
      else if (majorVersion > 0) osVersion = '10';
    } else {
      osVersion = platformVersion;
    }
  }

  const os: string = [osName, osVersion].filter(s => s != null && s !== '').join(' ');
  return { browserName, browserVersion, os: os === '' ? undefined : os };
}

export function issuesEmailTemplate(errorInfo?: { errorMessage: string; errorId: string }): string {
  const { browserName, browserVersion, os } = getBrowserAndOsInfo(
    window.navigator.userAgent,
    userAgentHighEntropyValues
  );

  const technicalDetails = Object.entries({
    [environment.siteName]: versionData.version,
    [browserName]: browserVersion ?? translate('issue_email.unknown'),
    ...(isBrave() ? { Brave: 'Yes' } : {}),
    OS: os ?? translate('issue_email.unknown'),
    URL: location.href,
    ...(errorInfo?.errorId ? { 'Error ID': errorInfo?.errorId } : {}),
    ...(errorInfo?.errorMessage ? { 'Error Message': errorInfo?.errorMessage } : {})
  })
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const body: string =
    translate('issue_email.heading') +
    '\n\n\n\n\n' +
    `--- ${translate('issue_email.technical_details')} ---` +
    '\n' +
    technicalDetails;

  return `mailto:${environment.issueEmail}?&body=${encodeURIComponent(body)}`;
}

export function parseJSON(str: string): any | undefined {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}

export const ASP_CULTURE_COOKIE_NAME = '.AspNetCore.Culture';

export function aspCultureCookieValue(language: string): string {
  return `c=${language}|uic=${language}`;
}

/**
 * @param cookie expect string of form "c=<tag>|uic=<tag>" where <tag> is a language tag
 */
export function getAspCultureCookieLanguage(cookie: string): string {
  const parts = cookie.split('|');
  let c: string | undefined;
  let uic: string | undefined;
  parts.forEach(value => {
    if (value.startsWith('c=')) {
      c = value.slice('c='.length);
    } else if (value.startsWith('uic=')) {
      uic = value.slice('uic='.length);
    }
  });
  return uic ?? c ?? 'en';
}

export function getI18nLocales(): Locale[] {
  return locales.map(locale => ({
    ...locale,
    canonicalTag: locale.tags[0],
    production: !!locale.production,
    direction: locale['direction'] === 'rtl' ? 'rtl' : 'ltr'
  }));
}

export function browserLinks(): { chromeLink: string; firefoxLink: string; safariLink: string } {
  return {
    chromeLink: getLinkHTML(translate('error.chrome'), 'https://www.google.com/chrome/'),
    firefoxLink: getLinkHTML(translate('error.firefox'), 'https://firefox.com'),
    safariLink: getLinkHTML(translate('error.safari'), 'https://www.apple.com/safari/')
  };
}

export function getLinkHTML(text: string, href: string): string {
  const a = document.createElement('a');
  a.href = href;
  a.setAttribute('target', '_blank');
  a.textContent = text;
  return a.outerHTML;
}

/** Attempts to parse a value as JSON. If the value is not a string or cannot be parsed, returns null. */
export function tryParseJSON(data: unknown): unknown {
  if (typeof data !== 'string') return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

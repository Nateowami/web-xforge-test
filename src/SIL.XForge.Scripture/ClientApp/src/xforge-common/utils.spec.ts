import { Component, DestroyRef, OnDestroy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { quietTakeUntilDestroyed } from './util/rxjs-util';
import { getAspCultureCookieLanguage, getBrowserAndOsInfo, getLinkHTML } from './utils';

describe('xforge-common utils', () => {
  it('should parse ASP Culture cookie', () => {
    let language = getAspCultureCookieLanguage('c=ab');
    expect(language).toEqual('ab');

    language = getAspCultureCookieLanguage('uic=cd');
    expect(language).toEqual('cd');

    language = getAspCultureCookieLanguage('c=ab|uic=cd');
    expect(language).toEqual('cd');

    language = getAspCultureCookieLanguage('uic=cd|c=ab');
    expect(language).toEqual('cd');

    language = getAspCultureCookieLanguage('');
    expect(language).toEqual('en');
  });

  it('should correctly generate links', () => {
    expect(getLinkHTML('example', 'https://example.com')).toEqual(
      `<a href="https://example.com" target="_blank">example</a>`
    );
  });

  describe('getBrowserAndOsInfo', () => {
    const androidChromeUserAgent =
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
    const windowsEdgeUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 ' +
      'Safari/537.36 Edg/155.0.3400.12';
    const linuxFirefoxUserAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/157.0';

    it('should use the user agent string when client hints are unavailable', () => {
      expect(getBrowserAndOsInfo(androidChromeUserAgent)).toEqual({
        browserName: 'Chrome',
        browserVersion: '155.0.0.0',
        osName: 'Android',
        osVersion: '10'
      });
      expect(getBrowserAndOsInfo(linuxFirefoxUserAgent)).toEqual({
        browserName: 'Firefox',
        browserVersion: '157.0',
        osName: 'Linux',
        osVersion: undefined
      });
    });

    it('should prefer client hints over the frozen user agent string', () => {
      expect(
        getBrowserAndOsInfo(androidChromeUserAgent, {
          platformVersion: '14.0.0',
          fullVersionList: [
            { brand: 'Not-A.Brand', version: '99.0.0.0' },
            { brand: 'Chromium', version: '155.0.8059.41' },
            { brand: 'Google Chrome', version: '155.0.8059.41' }
          ]
        })
      ).toEqual({ browserName: 'Chrome', browserVersion: '155.0.8059.41', osName: 'Android', osVersion: '14.0.0' });
    });

    it('should map the Windows platform version to the Windows release', () => {
      const fullVersionList = [
        { brand: 'Chromium', version: '155.0.8059.41' },
        { brand: 'Microsoft Edge', version: '155.0.3400.12' }
      ];
      expect(getBrowserAndOsInfo(windowsEdgeUserAgent, { platformVersion: '15.0.0', fullVersionList })).toEqual({
        browserName: 'Microsoft Edge',
        browserVersion: '155.0.3400.12',
        osName: 'Windows',
        osVersion: '11'
      });
      expect(getBrowserAndOsInfo(windowsEdgeUserAgent, { platformVersion: '10.0.0', fullVersionList }).osVersion).toBe(
        '10'
      );
      // Windows 7/8/8.1 report 0.x; keep what the user agent string says
      expect(getBrowserAndOsInfo(windowsEdgeUserAgent, { platformVersion: '0.3.0', fullVersionList }).osVersion).toBe(
        'NT 10.0'
      );
    });

    it('should ignore an empty platform version', () => {
      const linuxChromeUserAgent =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
      expect(getBrowserAndOsInfo(linuxChromeUserAgent, { platformVersion: '' }).osVersion).toBeUndefined();
    });
  });
});

describe('quietTakeUntilDestroyed', () => {
  it('should unsubscribe observables when the destroyRef callback is called', () => {
    let onDestroyCallback: () => void;
    const destroyRef: DestroyRef = {
      onDestroy: (callback: () => void) => {
        onDestroyCallback = callback;
        return () => {};
      },
      destroyed: false
    };

    let completed = false;

    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(destroyRef)).subscribe({
      complete: () => {
        completed = true;
      }
    });

    expect(completed).toBeFalse();
    onDestroyCallback!();
    expect(completed).toBeTrue();
  });

  it('should unsubscribe when the component is destroyed', () => {
    const fixture = TestBed.createComponent(QuietTakeUntilDestroyedTestComponent);
    const component = fixture.componentInstance;
    expect(component.mainSubjectCompleted).toBeFalse();
    expect(component.subjectCreatedAfterDestroyCompleted).toBeFalse();
    fixture.destroy();
    expect(component.mainSubjectCompleted).toBeTrue();
    expect(component.subjectCreatedAfterDestroyCompleted).toBeTrue();
  });
});

@Component({})
class QuietTakeUntilDestroyedTestComponent implements OnDestroy {
  mainSubjectCompleted = false;
  subjectCreatedAfterDestroyCompleted = false;

  constructor(private destroyRef: DestroyRef) {
    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(this.destroyRef)).subscribe({
      complete: () => {
        this.mainSubjectCompleted = true;
      }
    });
  }

  ngOnDestroy(): void {
    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(this.destroyRef, { logWarnings: false })).subscribe({
      complete: () => {
        this.subjectCreatedAfterDestroyCompleted = true;
      }
    });
  }
}

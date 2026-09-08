import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import Bugsnag, { Event, NotifiableError, OnErrorCallback } from '@bugsnag/js';
import { anything, capture, mock, verify, when } from 'ts-mockito';
import { ErrorReportStore, StoredErrorReport } from './error-report-store';
import { ErrorReportingService } from './error-reporting.service';
import { OnlineStatusService } from './online-status.service';
import { provideTestOnlineStatus } from './test-online-status-providers';
import { TestOnlineStatusService } from './test-online-status.service';
import { configureTestingModule } from './test-utils';

const mockedErrorReportStore = mock(ErrorReportStore);

describe('ErrorReportingService', () => {
  configureTestingModule(() => ({
    providers: [
      provideTestOnlineStatus(),
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: ErrorReportStore, useMock: mockedErrorReportStore }
    ]
  }));

  it('should redact the access_token from the breadcrumb and request URLs', async () => {
    const event = Event.create(
      new Error('some error'),
      false,
      {
        severity: 'error',
        unhandled: false,
        severityReason: {
          type: 'blah',
          blah: 'blah'
        }
      },
      'some component',
      3
    );

    event.breadcrumbs = [
      {
        type: 'navigation',
        metadata: {
          from: 'http://localhost:5000/somewhere&access_token=thing',
          to: 'http://localhost:5000/somewhere'
        },
        message: '',
        timestamp: new Date()
      },
      {
        type: 'navigation',
        metadata: {
          from: 'http://localhost:5000/projects#access_token=secret',
          to: 'http://localhost:5000/projects'
        },
        message: '',
        timestamp: new Date()
      }
    ];
    event.request = { url: 'http://localhost:5000/projects#access_token=12345' };

    ErrorReportingService.beforeSend({}, event, true);
    expect(event.breadcrumbs[0].metadata.from).toEqual('http://localhost:5000/somewhere&access_token=thing');
    expect(event.breadcrumbs[0].metadata.to).toEqual('http://localhost:5000/somewhere');
    expect(event.breadcrumbs[1].metadata.from).toEqual(
      'http://localhost:5000/projects#access_token=redacted_for_error_report'
    );
    expect(event.breadcrumbs[1].metadata.to).toEqual('http://localhost:5000/projects');
    expect(event.request.url).toEqual('http://localhost:5000/projects#access_token=redacted_for_error_report');
  });

  it('stores the error report while offline, rather than losing it', fakeAsync(() => {
    const env = new TestEnvironment({ isOnline: false });

    // SUT
    env.service.notify(new Error('offline error'));
    flush();

    expect(env.bugsnagNotifySpy).not.toHaveBeenCalled();
    const [report] = capture(mockedErrorReportStore.add).last();
    expect(report.message).toEqual('offline error');
    expect(report.name).toEqual('Error');
    expect(report.stack).toContain('offline error');
    expect(report.unhandled).toBe(true);
    expect(report.url).toContain('http');
  }));

  it('stores the error report if it cannot be delivered while online', fakeAsync(() => {
    const env = new TestEnvironment({ deliveryError: new Error('Request failed with status 0') });

    // SUT
    env.service.notify(new Error('undelivered error'));
    flush();

    expect(env.bugsnagNotifySpy).toHaveBeenCalled();
    const [report] = capture(mockedErrorReportStore.add).last();
    expect(report.message).toEqual('undelivered error');
  }));

  it('does not store the error report when it is delivered', fakeAsync(() => {
    const env = new TestEnvironment();

    // SUT
    env.service.notify(new Error('delivered error'));
    flush();

    expect(env.bugsnagNotifySpy).toHaveBeenCalled();
    verify(mockedErrorReportStore.add(anything())).never();
  }));

  it('sends stored error reports when coming back online, and removes them', fakeAsync(() => {
    const env = new TestEnvironment({ isOnline: false, storedReports: [TestEnvironment.createStoredReport()] });
    expect(env.bugsnagNotifySpy).not.toHaveBeenCalled();

    // SUT
    env.onlineStatus.setIsOnline(true);
    flush();

    const [error, onError] = env.bugsnagNotifySpy.calls.mostRecent().args;
    expect(error.message).toEqual('error from earlier');
    expect(error.stack).toEqual('the original stack');
    const event: Event = TestEnvironment.createEvent();
    onError!(event, () => {});
    expect(event.device.time).toEqual(new Date(TestEnvironment.errorOccurredAt));
    expect(event.getMetadata('offline').errorOccurredAt).toEqual(
      new Date(TestEnvironment.errorOccurredAt).toISOString()
    );
    expect(event.getMetadata('offline').errorOccurredOnPage).toEqual(
      'http://localhost:5000/projects/project01/translate/MAT/1'
    );
    expect(event.getMetadata('someTab').someKey).toEqual('some value');
    verify(mockedErrorReportStore.remove('report01')).once();
  }));

  it('keeps stored error reports that still cannot be delivered', fakeAsync(() => {
    const env = new TestEnvironment({
      isOnline: false,
      storedReports: [TestEnvironment.createStoredReport()],
      deliveryError: new Error('Request failed with status 0')
    });

    // SUT
    env.onlineStatus.setIsOnline(true);
    flush();

    expect(env.bugsnagNotifySpy).toHaveBeenCalled();
    verify(mockedErrorReportStore.remove(anything())).never();
  }));

  it('sends stored error reports when the app starts up online', fakeAsync(() => {
    const env = new TestEnvironment({ storedReports: [TestEnvironment.createStoredReport()] });
    flush();

    expect(env.bugsnagNotifySpy).toHaveBeenCalled();
    verify(mockedErrorReportStore.remove('report01')).once();
  }));
});

class TestEnvironment {
  static readonly errorOccurredAt: number = new Date('2026-01-01T00:00:00.000Z').getTime();

  readonly onlineStatus: TestOnlineStatusService;
  readonly service: ErrorReportingService;
  readonly bugsnagNotifySpy: jasmine.Spy;

  constructor({
    isOnline = true,
    storedReports = [],
    deliveryError = null
  }: {
    isOnline?: boolean;
    storedReports?: StoredErrorReport[];
    deliveryError?: Error | null;
  } = {}) {
    when(mockedErrorReportStore.add(anything())).thenResolve();
    when(mockedErrorReportStore.getAll()).thenResolve(storedReports);
    when(mockedErrorReportStore.remove(anything())).thenResolve();
    spyOn(Bugsnag, 'isStarted').and.returnValue(true);
    this.bugsnagNotifySpy = spyOn(Bugsnag, 'notify').and.callFake(
      (_error: NotifiableError, _onError?: OnErrorCallback | null, callback?: (err: any, event: any) => void) =>
        callback?.(deliveryError, undefined)
    );
    this.onlineStatus = TestBed.inject(OnlineStatusService) as TestOnlineStatusService;
    this.onlineStatus.setIsOnline(isOnline);
    this.service = TestBed.inject(ErrorReportingService);
  }

  static createStoredReport(): StoredErrorReport {
    return {
      id: 'report01',
      timestamp: TestEnvironment.errorOccurredAt,
      name: 'Error',
      message: 'error from earlier',
      url: 'http://localhost:5000/projects/project01/translate/MAT/1',
      stack: 'the original stack',
      unhandled: true,
      metadata: { someTab: { someKey: 'some value' } }
    };
  }

  static createEvent(): Event {
    return Event.create(
      new Error('some error'),
      false,
      { severity: 'error', unhandled: false, severityReason: { type: 'blah' } },
      'some component',
      3
    );
  }
}

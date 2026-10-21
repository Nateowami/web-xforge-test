import { Injector } from '@angular/core';
import { Breadcrumb, Event } from '@bugsnag/js';
import { anything, instance, mock, when } from 'ts-mockito';
import { BugsnagService } from './bugsnag.service';
import { ErrorReportingService, PENDING_ERROR_REPORTS, PendingErrorReport } from './error-reporting.service';
import { MemoryOfflineStore } from './memory-offline-store';
import { OfflineStore } from './offline-store';

describe('ErrorReportingService', () => {
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
});

describe('ErrorReportingService pending reports', () => {
  it('stores a report that could not be delivered and sends it as the original report later', async () => {
    const env = new TestEnvironment();
    env.service.addMeta({ eventId: 'event01' });
    env.deliveryFails = true;
    env.service.notify(new Error('offline error'));
    await env.settle();

    expect((await env.pendingReports).length).toBe(1);
    expect(env.sentEvents.length).toBe(1);
    const original = env.sentEvents[0];

    // Things changed while waiting to get back online
    env.service.addMeta({ eventId: 'event02' });
    env.now = new Date('2020-07-31T00:00:00.000Z');
    env.lastBreadcrumb = 'back online';
    env.deliveryFails = false;
    await env.service.sendPendingReports();
    await env.settle();

    expect((await env.pendingReports).length).toBe(0);
    expect(env.sentEvents.length).toBe(2);
    const resent = env.sentEvents[1];
    expect(resent.errors[0].errorMessage).toEqual('offline error');
    // Bugsnag sends the event as JSON, so compare what would be sent
    expect(JSON.stringify(resent.errors)).toEqual(JSON.stringify(original.errors));
    expect(resent.getMetadata('custom', 'eventId')).toEqual('event01');
    expect(resent.getMetadata('delivery')).toEqual({ delayed: true, failedAttempts: 1 });
    expect(resent.breadcrumbs.map(b => b.message)).toEqual(['before the error']);
    expect(JSON.stringify(resent.breadcrumbs)).toEqual(JSON.stringify(original.breadcrumbs));
    expect(new Date(resent.device.time!).toISOString()).toEqual(env.errorTime.toISOString());
    expect(resent.unhandled).toBe(true);
    expect(resent.severity).toEqual('error');
  });

  it('does not store reports that were delivered', async () => {
    const env = new TestEnvironment();
    env.service.notify(new Error('online error'));
    await env.settle();

    expect(env.sentEvents.length).toBe(1);
    expect((await env.pendingReports).length).toBe(0);
  });

  it('gives up on a report after repeated delivery failures', async () => {
    const env = new TestEnvironment();
    env.deliveryFails = true;
    env.service.notify(new Error('rejected error'));
    await env.settle();
    expect((await env.pendingReports).length).toBe(1);

    await env.service.sendPendingReports();
    await env.settle();
    expect((await env.pendingReports).length).toBe(1);
    expect((await env.pendingReports)[0].attempts).toBe(2);

    await env.service.sendPendingReports();
    await env.settle();
    expect((await env.pendingReports).length).toBe(0);
    expect(env.sentEvents.length).toBe(3);
  });

  it('limits how many reports are stored', async () => {
    const env = new TestEnvironment();
    env.deliveryFails = true;
    for (let i = 0; i < 8; i++) {
      env.service.notify(new Error('offline error ' + i));
      await env.settle();
    }

    expect((await env.pendingReports).length).toBe(5);
  });

  it('limits how many reports are stored when several fail at the same time', async () => {
    const env = new TestEnvironment();
    env.deliveryFails = true;
    for (let i = 0; i < 8; i++) {
      env.service.notify(new Error('offline error ' + i));
    }
    await env.settle();

    expect((await env.pendingReports).length).toBe(5);
  });

  it('keeps reports that Bugsnag cancels instead of sending', async () => {
    const env = new TestEnvironment();
    env.deliveryFails = true;
    // All 8 count towards Bugsnag's limit of 10 events, so only 2 more can be sent in this page
    for (let i = 0; i < 8; i++) {
      env.service.notify(new Error('offline error ' + i));
      await env.settle();
    }
    expect((await env.pendingReports).length).toBe(5);

    env.deliveryFails = false;
    await env.service.sendPendingReports();
    await env.settle();
    expect(env.sentEvents.length).toBe(10);
    const pendingReports = await env.pendingReports;
    expect(pendingReports.length).toBe(3);
    expect(pendingReports.map(r => r.attempts)).toEqual([1, 1, 1]);

    // e.g. after navigating to another page
    env.eventCount = 0;
    await env.service.sendPendingReports();
    await env.settle();
    expect(env.sentEvents.length).toBe(13);
    expect((await env.pendingReports).length).toBe(0);
  });

  it('stores errors and circular references in metadata the way Bugsnag would send them', async () => {
    const env = new TestEnvironment();
    const circular: any = { name: 'circular' };
    circular.self = circular;
    env.service.addMeta({ error: new Error('metadata error'), circular });
    env.deliveryFails = true;
    env.service.notify(new Error('offline error'));
    await env.settle();

    const pendingReports = await env.pendingReports;
    expect(pendingReports.length).toBe(1);
    expect(pendingReports[0].metadata.custom).toEqual({
      error: { name: 'Error', message: 'metadata error' },
      circular: { name: 'circular', self: '[Circular]' }
    });
  });
});

class TestEnvironment {
  readonly offlineStore = new MemoryOfflineStore();
  readonly mockedBugsnagService = mock(BugsnagService);
  readonly service: ErrorReportingService;
  readonly sentEvents: Event[] = [];
  readonly errorTime = new Date('2020-07-30T01:15:59.000Z');
  deliveryFails = false;
  /** How many events count towards Bugsnag's limit of events per page */
  eventCount = 0;
  now = this.errorTime;
  lastBreadcrumb = 'before the error';

  constructor() {
    const injector = Injector.create({ providers: [{ provide: OfflineStore, useValue: this.offlineStore }] });
    // Imitate Bugsnag: create the event, apply its limit of 10 events, run the onError callback, then attempt delivery
    when(this.mockedBugsnagService.notify(anything(), anything(), anything())).thenCall(
      (error: Error, onError: (event: Event) => void, postReportCallback: (err: any, event: Event) => void) => {
        const event = Event.create(
          error,
          true,
          { severity: 'warning', unhandled: false, severityReason: { type: 'handledException' } },
          'notify',
          1
        );
        event.breadcrumbs = [
          Object.assign(new Breadcrumb(), { message: this.lastBreadcrumb, type: 'log', timestamp: this.now })
        ];
        event.device = { time: this.now };
        if (this.eventCount >= 10) {
          // Bugsnag reports a cancelled event the same way as a delivered one
          postReportCallback(null, event);
          return true;
        }
        this.eventCount++;
        onError(event);
        this.sentEvents.push(event);
        postReportCallback(this.deliveryFails ? new Error('Request failed with status 0') : null, event);
        return true;
      }
    );
    this.service = new ErrorReportingService(instance(this.mockedBugsnagService), injector);
  }

  get pendingReports(): Promise<PendingErrorReport[]> {
    return this.offlineStore.getAll<PendingErrorReport>(PENDING_ERROR_REPORTS);
  }

  /** Waits for the reports to be stored in the offline store. */
  settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve));
  }
}

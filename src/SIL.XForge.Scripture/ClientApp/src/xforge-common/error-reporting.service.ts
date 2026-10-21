import { Injectable, Injector } from '@angular/core';
import { Breadcrumb, Event, NotifiableError } from '@bugsnag/js';
import safeJsonStringify from '@bugsnag/safe-json-stringify';
import { BugsnagService } from './bugsnag.service';
import { OfflineData, OfflineStore } from './offline-store';
import { objectId } from './utils';

export interface EventMetadata {
  [key: string]: object;
}

/** IndexedDB collection holding error reports that could not be delivered, e.g. because the user was offline. */
export const PENDING_ERROR_REPORTS = 'pending_error_reports';

/** The parts of a Bugsnag event needed to send it again later as the same report. */
export interface PendingErrorReport extends OfflineData {
  /** How many times delivering this report has failed. */
  attempts: number;
  errors: Event['errors'];
  breadcrumbs: { type: Breadcrumb['type']; message: string; metadata: Breadcrumb['metadata']; timestamp: string }[];
  metadata: EventMetadata;
  severity: Event['severity'];
  unhandled: boolean;
  context?: string;
  groupingHash?: string;
  app: Event['app'];
  device: Event['device'];
  request: Event['request'];
  user: ReturnType<Event['getUser']>;
}

/**
 * What became of an event passed to Bugsnag. It is cancelled when Bugsnag decides not to send it, e.g. because of its
 * limit of 10 events per page (reset on navigation), which failed deliveries also count towards.
 */
type DeliveryOutcome = 'delivered' | 'failed' | 'cancelled';

/** Resent reports count towards Bugsnag's limit of events per page, so only keep a few to leave room for new errors. */
const MAX_PENDING_REPORTS = 5;
/** Drop a report after this many failed deliveries, as it is probably being rejected rather than lost in transit. */
const MAX_DELIVERY_ATTEMPTS = 3;

@Injectable({
  providedIn: 'root'
})
export class ErrorReportingService {
  static beforeSend(metaData: EventMetadata, event: Event, unhandled: boolean): any {
    if (typeof event.request.url === 'string') {
      event.request.url = ErrorReportingService.redactAccessToken(event.request.url as string);
    }
    event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
      if (breadcrumb.type === 'navigation' && breadcrumb.metadata && typeof breadcrumb.metadata.from === 'string') {
        breadcrumb.metadata.from = ErrorReportingService.redactAccessToken(breadcrumb.metadata.from);
        breadcrumb.metadata.to = ErrorReportingService.redactAccessToken(breadcrumb.metadata.to);
      }
      return breadcrumb;
    });
    if (unhandled) {
      event.severity = 'error';
      event.unhandled = true;
    }

    for (const tabName in metaData) {
      if (metaData.hasOwnProperty(tabName)) {
        event.addMetadata(tabName, metaData[tabName]);
      }
    }
  }

  /**
   * Takes any value and normalizes it by converting it to an object. If it is already an object that is not null and is
   * not an array, the object is returned. Otherwise the value is converted to a string, an error is constructed with a
   * message that includes that string, and that error is returned.
   */
  static normalizeError(error: unknown): object {
    if (typeof error !== 'object' || error == null || Array.isArray(error)) {
      // using String(value) rather than plain string concatenation, because concatenating a symbol throws an error
      return new Error('Unknown error: ' + String(error));
    } else return error;
  }

  private static redactAccessToken(url: string): string {
    return url.replace(/^(.*#access_token=).*$/, '$1redacted_for_error_report');
  }

  /** Makes a newly created event match the report that failed to send, rather than the app's current state. */
  private static restoreEvent(event: Event, report: PendingErrorReport): void {
    event.errors = report.errors;
    event.breadcrumbs = report.breadcrumbs.map(b =>
      Object.assign(new Breadcrumb(), { ...b, timestamp: new Date(b.timestamp) })
    );
    for (const tabName in report.metadata) {
      event.addMetadata(tabName, report.metadata[tabName]);
    }
    event.addMetadata('delivery', { delayed: true, failedAttempts: report.attempts });
    event.severity = report.severity;
    event.unhandled = report.unhandled;
    event.context = report.context;
    event.groupingHash = report.groupingHash;
    // The device section includes the time the error occurred
    event.app = report.app;
    event.device = report.device;
    event.request = report.request;
    event.setUser(report.user.id, report.user.email, report.user.name);
  }

  private metadata: EventMetadata = {};
  private sendingPendingReports = false;
  private pendingReportWrites: Promise<void> = Promise.resolve();

  constructor(
    private readonly bugsnagService: BugsnagService,
    private readonly injector: Injector
  ) {}

  addMeta(data: object, tabName: string = 'custom'): void {
    this.metadata[tabName] = { ...this.metadata[tabName], ...data };
  }

  notify(error: NotifiableError, callback?: (err: any, report: any) => void, unhandled: boolean = true): void {
    void this.send(error, event => ErrorReportingService.beforeSend(this.metadata, event, unhandled), callback).then(
      ({ outcome, event }) => {
        // Bugsnag drops events it fails to deliver, e.g. when offline, so keep them to send once back online
        if (outcome === 'failed') this.storePendingReport(event);
      }
    );
  }

  silentError(message: string, metadata?: object): void {
    if (metadata != null) {
      this.addMeta(metadata);
    }
    this.notify({ name: 'Silent Error', message: message }, undefined, false);
    console.error(message);
  }

  /** Sends the error reports that could not be delivered earlier. Call this when the app comes online. */
  async sendPendingReports(): Promise<void> {
    if (this.sendingPendingReports) return;
    this.sendingPendingReports = true;
    try {
      const offlineStore = this.offlineStore;
      // Sent one at a time, and each stored copy is only removed once Bugsnag has delivered it
      for (const report of await offlineStore.getAll<PendingErrorReport>(PENDING_ERROR_REPORTS)) {
        const error = report.errors[0];
        const { outcome } = await this.send(
          { name: error?.errorClass ?? 'Error', message: error?.errorMessage ?? '' },
          event => ErrorReportingService.restoreEvent(event, report)
        );
        // Bugsnag will cancel the rest too, so keep them all for the next time the app comes online
        if (outcome === 'cancelled') break;
        const attempts = report.attempts + 1;
        if (outcome === 'delivered' || attempts >= MAX_DELIVERY_ATTEMPTS) {
          await offlineStore.delete(PENDING_ERROR_REPORTS, report.id);
        } else {
          const updatedReport: PendingErrorReport = { ...report, attempts };
          await offlineStore.put(PENDING_ERROR_REPORTS, updatedReport);
        }
      }
    } catch (error) {
      console.error('Unable to send pending error reports', error);
    } finally {
      this.sendingPendingReports = false;
    }
  }

  // Resolved lazily, as this service is injected very early (and in many tests) where the offline store is not needed
  private get offlineStore(): OfflineStore {
    return this.injector.get(OfflineStore);
  }

  private send(
    error: NotifiableError,
    onError: (event: Event) => void,
    callback?: (err: any, report: any) => void
  ): Promise<{ outcome: DeliveryOutcome; event?: Event }> {
    return new Promise(resolve => {
      let reachedOnError = false;
      const started = this.bugsnagService.notify(
        error,
        event => {
          // Bugsnag runs this callback after its own ones and only if none of them cancelled the event. It then tries
          // to deliver the event, even if this callback throws.
          reachedOnError = true;
          onError(event);
        },
        (err, event) => {
          // Bugsnag also reports success when it cancels an event, so tell the two apart
          resolve({ outcome: err != null ? 'failed' : reachedOnError ? 'delivered' : 'cancelled', event });
          callback?.(err, event);
        }
      );
      if (!started) resolve({ outcome: 'cancelled' });
    });
  }

  /** Stores a snapshot of an event that failed to send. */
  private storePendingReport(event: Event | undefined): void {
    if (event == null) return;
    // Serialize the writes, so that reports failing at the same time cannot all get past the limit
    this.pendingReportWrites = this.pendingReportWrites.then(() => this.writePendingReport(event));
  }

  private async writePendingReport(event: Event): Promise<void> {
    try {
      const offlineStore = this.offlineStore;
      if ((await offlineStore.getAllIds(PENDING_ERROR_REPORTS)).length >= MAX_PENDING_REPORTS) return;
      const report: PendingErrorReport = {
        id: objectId(),
        attempts: 1,
        errors: event.errors,
        breadcrumbs: event.breadcrumbs.map(b => ({
          type: b.type,
          message: b.message,
          metadata: b.metadata,
          timestamp: new Date(b.timestamp).toISOString()
        })),
        metadata: Object.fromEntries(Object.keys(this.metadata).map(tabName => [tabName, event.getMetadata(tabName)])),
        severity: event.severity,
        unhandled: event.unhandled,
        context: event.context,
        groupingHash: event.groupingHash,
        app: event.app,
        device: event.device,
        request: event.request,
        user: event.getUser()
      };
      // Serialize the way Bugsnag does, which keeps the name and message of errors and replaces circular references,
      // and drops anything IndexedDB cannot store, such as functions
      await offlineStore.put(PENDING_ERROR_REPORTS, JSON.parse(safeJsonStringify(report)));
    } catch (error) {
      console.error('Unable to store error report for sending later', error);
    }
  }
}

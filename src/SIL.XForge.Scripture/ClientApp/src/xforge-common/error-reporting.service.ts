import { DestroyRef, Injectable } from '@angular/core';
import Bugsnag, { Event, NotifiableError } from '@bugsnag/js';
import { filter } from 'rxjs/operators';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { hasStringProp } from '../type-utils';
import { ErrorReportStore, StoredErrorReport } from './error-report-store';
import { LocationService } from './location.service';
import { OnlineStatusService } from './online-status.service';
import { objectId } from './utils';

export interface EventMetadata {
  [key: string]: object;
}

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

  /** Describes an error in a way that can be stored, and that Bugsnag can group the same way as the original error. */
  private static describeError(error: NotifiableError): { name: string; message: string; stack?: string } {
    let name: string = 'Error';
    if (hasStringProp(error, 'name')) {
      name = error.name;
    } else if (hasStringProp(error, 'errorClass')) {
      name = error.errorClass;
    }
    let message: string = String(error);
    if (hasStringProp(error, 'message')) {
      message = error.message;
    } else if (hasStringProp(error, 'errorMessage')) {
      message = error.errorMessage;
    }
    return { name: name, message: message, stack: hasStringProp(error, 'stack') ? error.stack : undefined };
  }

  private metadata: EventMetadata = {};
  private sendingStoredReports = false;

  constructor(
    private readonly onlineStatusService: OnlineStatusService,
    private readonly errorReportStore: ErrorReportStore,
    private readonly locationService: LocationService,
    destroyRef: DestroyRef
  ) {
    // Errors that occurred while offline are reported when the user comes back online, which includes reports stored
    // by a previous run of the app, since this emits the current status on subscription.
    this.onlineStatusService.onlineBrowserStatus$
      .pipe(
        filter(isOnline => isOnline),
        quietTakeUntilDestroyed(destroyRef)
      )
      .subscribe(() => void this.sendStoredReports());
  }

  addMeta(data: object, tabName: string = 'custom'): void {
    this.metadata[tabName] = { ...this.metadata[tabName], ...data };
  }

  notify(error: NotifiableError, callback?: (err: any, report: any) => void, unhandled: boolean = true): void {
    if (!Bugsnag.isStarted()) return;
    // The metadata is copied because it can change before the report is sent
    const metadata: EventMetadata = { ...this.metadata };
    if (!this.onlineStatusService.isBrowserOnline) {
      this.store(error, unhandled, metadata);
      callback?.(null, undefined);
      return;
    }
    Bugsnag.notify(
      error,
      event => ErrorReportingService.beforeSend(metadata, event, unhandled),
      (err, report) => {
        // The error report is stored to try again later if it could not be delivered, such as when the browser
        // believes it is online but there is no working connection.
        if (err != null) this.store(error, unhandled, metadata);
        callback?.(err, report);
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

  /** Stores an error report so it can be sent when the user is next online. */
  private store(error: NotifiableError, unhandled: boolean, metadata: EventMetadata): void {
    const report: StoredErrorReport = {
      id: objectId(),
      timestamp: Date.now(),
      ...ErrorReportingService.describeError(error),
      url: ErrorReportingService.redactAccessToken(this.locationService.href),
      unhandled: unhandled,
      metadata: metadata
    };
    // Nothing can be thrown from here, or reporting an error could trigger another error to report
    this.errorReportStore
      .add(report)
      .catch(storeError => console.error('Unable to store an error report to send later', storeError));
  }

  private async sendStoredReports(): Promise<void> {
    if (this.sendingStoredReports || !Bugsnag.isStarted()) return;
    this.sendingStoredReports = true;
    try {
      for (const report of await this.errorReportStore.getAll()) {
        if (!(await this.sendStoredReport(report))) {
          // Delivery is failing, so keep this and any remaining reports to try again later
          break;
        }
        await this.errorReportStore.remove(report.id);
      }
    } catch (storeError) {
      console.error('Unable to send stored error reports', storeError);
    } finally {
      this.sendingStoredReports = false;
    }
  }

  private sendStoredReport(report: StoredErrorReport): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const error = new Error(report.message);
      error.name = report.name;
      if (report.stack != null) {
        error.stack = report.stack;
      }
      const occurredAt = new Date(report.timestamp);
      const metadata: EventMetadata = {
        ...report.metadata,
        offline: {
          reportDelayed: true,
          errorOccurredAt: occurredAt.toISOString(),
          errorOccurredOnPage: report.url
        }
      };
      Bugsnag.notify(
        error,
        event => {
          ErrorReportingService.beforeSend(metadata, event, report.unhandled);
          // Report the time the error occurred rather than the time it was able to be sent
          event.device = { ...event.device, time: occurredAt };
        },
        err => resolve(err == null)
      );
    });
  }
}

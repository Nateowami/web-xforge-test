import { Injectable } from '@angular/core';
import Bugsnag, { BreadcrumbType, BrowserConfig, Client, Event, NotifiableError, OnErrorCallback } from '@bugsnag/js';
import { NodeConfig } from '@bugsnag/node';

/**
 * Wrapper around Bugsnag. This injectable service can be mocked to make dependencies of it testable.
 */
@Injectable({
  providedIn: 'root'
})
export class BugsnagService {
  start(apiKeyOrOpts: string | BrowserConfig | NodeConfig): Client {
    return Bugsnag.start(apiKeyOrOpts);
  }

  leaveBreadcrumb(message: string, metadata?: { [key: string]: any }, type?: BreadcrumbType): void {
    if (Bugsnag.isStarted()) Bugsnag.leaveBreadcrumb(message, metadata, type);
  }

  /** Returns false if Bugsnag is not started, in which case the callbacks are never called. */
  notify(
    error: NotifiableError,
    onError?: OnErrorCallback,
    postReportCallback?: (err: any, event: Event) => void
  ): boolean {
    if (!Bugsnag.isStarted()) return false;
    Bugsnag.notify(error, onError, postReportCallback);
    return true;
  }

  setUser(id?: string, email?: string, name?: string): void {
    Bugsnag.setUser(id, email, name);
  }
}

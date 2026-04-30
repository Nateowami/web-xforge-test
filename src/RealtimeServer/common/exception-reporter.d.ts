import { NotifiableError } from '@bugsnag/js';
export declare class ExceptionReporter {
  private readonly bugsnagClient;
  constructor(bugsnagApiKey: string, releaseStage: string, version: string);
  report(error: NotifiableError): void;
}

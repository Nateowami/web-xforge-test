'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExceptionReporter = void 0;
const js_1 = __importDefault(require('@bugsnag/js'));
class ExceptionReporter {
  constructor(bugsnagApiKey, releaseStage, version) {
    this.bugsnagClient = js_1.default.createClient({
      apiKey: bugsnagApiKey,
      appVersion: version,
      appType: 'node',
      enabledReleaseStages: ['live', 'qa'],
      releaseStage: releaseStage,
      autoDetectErrors: false
    });
  }
  report(error) {
    this.bugsnagClient.notify(error);
  }
}
exports.ExceptionReporter = ExceptionReporter;
//# sourceMappingURL=exception-reporter.js.map

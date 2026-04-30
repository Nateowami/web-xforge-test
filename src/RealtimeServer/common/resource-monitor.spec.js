'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = __importDefault(require('path'));
const resource_monitor_1 = require('./resource-monitor');
let mockFsPromises;
jest.mock('fs/promises', () => ({
  mkdir: (...args) => mockFsPromises.mkdir(...args),
  writeFile: (...args) => mockFsPromises.writeFile(...args),
  appendFile: (...args) => mockFsPromises.appendFile(...args)
}));
describe('ResourceMonitor', () => {
  describe('getOutputDir', () => {
    it('prioritizes SF_RESOURCE_REPORTS_PATH', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const sfResourceReportsPath = `${path_1.default.sep}sf-resource-reports-path`;
        const env = new TestEnvironment({
          SF_RESOURCE_REPORTS_PATH: sfResourceReportsPath,
          XDG_DATA_HOME: `${path_1.default.sep}xdg-data-home`,
          HOME: `${path_1.default.sep}home`
        });
        const expectedDir = sfResourceReportsPath;
        // SUT
        yield env.monitor.record();
        expect(mockFsPromises.writeFileCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.writeFileCalls[0]).toContain(`${expectedDir}${path_1.default.sep}heap-info.csv`);
        expect(mockFsPromises.mkdirCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.mkdirCalls).toContain(expectedDir);
      }));
    it('uses XDG_DATA_HOME when SF_RESOURCE_REPORTS_PATH is unset', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const xdgDataHome = `${path_1.default.sep}xdg-data-home`;
        const env = new TestEnvironment({
          SF_RESOURCE_REPORTS_PATH: null,
          XDG_DATA_HOME: xdgDataHome,
          HOME: `${path_1.default.sep}home`
        });
        const reportDirName = 'sf-resource-reports';
        const expectedDir = path_1.default.join(xdgDataHome, reportDirName);
        // SUT
        yield env.monitor.record();
        expect(mockFsPromises.writeFileCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.writeFileCalls[0]).toContain(`${expectedDir}${path_1.default.sep}heap-info.csv`);
        expect(mockFsPromises.mkdirCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.mkdirCalls).toContain(expectedDir);
      }));
    it('uses HOME when SF_RESOURCE_REPORTS_PATH and XDG_DATA_HOME are unset', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment({
          SF_RESOURCE_REPORTS_PATH: null,
          XDG_DATA_HOME: null,
          HOME: `${path_1.default.sep}home`
        });
        const reportDirName = 'sf-resource-reports';
        const expectedDir = path_1.default.join(`${path_1.default.sep}home`, '.local', 'share', reportDirName);
        // SUT
        yield env.monitor.record();
        expect(mockFsPromises.writeFileCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.writeFileCalls[0]).toContain(`${expectedDir}${path_1.default.sep}heap-info.csv`);
        expect(mockFsPromises.mkdirCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.mkdirCalls).toContain(expectedDir);
      }));
    it('uses HOME when SF_RESOURCE_REPORTS_PATH is unset and XDG_DATA_HOME is empty', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        // XDG_DATA_HOME is not used if unset or empty
        // (https://specifications.freedesktop.org/basedir-spec/latest/#variables).
        const env = new TestEnvironment({
          SF_RESOURCE_REPORTS_PATH: null,
          XDG_DATA_HOME: '',
          HOME: `${path_1.default.sep}home`
        });
        const reportDirName = 'sf-resource-reports';
        const expectedDir = path_1.default.join(`${path_1.default.sep}home`, '.local', 'share', reportDirName);
        // SUT
        yield env.monitor.record();
        expect(mockFsPromises.writeFileCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.writeFileCalls[0]).toContain(`${expectedDir}${path_1.default.sep}heap-info.csv`);
        expect(mockFsPromises.mkdirCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.mkdirCalls).toContain(expectedDir);
      }));
    it('uses cwd when HOME, SF_RESOURCE_REPORTS_PATH, and XDG_DATA_HOME are unset', () =>
      __awaiter(void 0, void 0, void 0, function* () {
        const env = new TestEnvironment({ SF_RESOURCE_REPORTS_PATH: null, XDG_DATA_HOME: null, HOME: null });
        const reportDirName = 'sf-resource-reports';
        const expectedDir = path_1.default.join(process.cwd(), reportDirName);
        // SUT
        yield env.monitor.record();
        expect(mockFsPromises.writeFileCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.writeFileCalls[0]).toContain(`${expectedDir}${path_1.default.sep}heap-info.csv`);
        expect(mockFsPromises.mkdirCalls.length).toBeGreaterThan(0);
        expect(mockFsPromises.mkdirCalls).toContain(expectedDir);
      }));
  });
});
class MockFsPromises {
  constructor() {
    this.mkdirCalls = [];
    this.writeFileCalls = [];
    this.appendFileCalls = [];
  }
  mkdir(p, _options) {
    this.mkdirCalls.push(p);
    return Promise.resolve();
  }
  writeFile(p, _data, _options) {
    this.writeFileCalls.push(p);
    return Promise.resolve();
  }
  appendFile(p, _data, _options) {
    this.appendFileCalls.push(p);
    return Promise.resolve();
  }
}
class TestEnvironment {
  constructor(values) {
    if (values.SF_RESOURCE_REPORTS_PATH == null) delete process.env.SF_RESOURCE_REPORTS_PATH;
    else process.env.SF_RESOURCE_REPORTS_PATH = values.SF_RESOURCE_REPORTS_PATH;
    if (values.XDG_DATA_HOME == null) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = values.XDG_DATA_HOME;
    if (values.HOME == null) delete process.env.HOME;
    else process.env.HOME = values.HOME;
    // Recreate mock
    mockFsPromises = new MockFsPromises();
    // Reset singleton between tests
    resource_monitor_1.ResourceMonitor._instance = undefined;
    this.monitor = resource_monitor_1.ResourceMonitor.instance;
  }
}
//# sourceMappingURL=resource-monitor.spec.js.map

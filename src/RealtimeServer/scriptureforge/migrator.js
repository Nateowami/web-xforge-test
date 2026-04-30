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
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = __importDefault(require('fs'));
const mongodb_1 = require('mongodb');
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_mongo_1 = __importDefault(require('sharedb-mongo'));
require('../common/diagnostics');
const exception_reporter_1 = require('../common/exception-reporter');
const metadata_db_1 = require('../common/metadata-db');
const schema_version_repository_1 = require('../common/schema-version-repository');
const realtime_server_1 = __importDefault(require('./realtime-server'));
console.log(`Migrator has been invoked with ${JSON.stringify(process.argv.slice(2))}`);
if (process.argv.length !== 4) {
  console.error('Usage: node migrator.js <release stage> <version>');
  process.exit(1);
}
const stage = process.argv[2];
const version = process.argv[3];
// QA uses version numbers of the form 123, while live uses version numbers of the form 1.2.3
if (/\d+(?:\.\d+)*/.test(version) === false) {
  console.error('Version must contain one or more numbers separated by dots');
  process.exit(1);
}
const baseSettings = JSON.parse(fs_1.default.readFileSync('appsettings.json', 'utf8'));
const settingsFile = stage === 'Production' ? 'appsettings.json' : `appsettings.${stage}.json`;
const stageSettings = JSON.parse(fs_1.default.readFileSync(settingsFile, 'utf8'));
const bugsnagApiKey =
  (_b = (_a = process.env.Bugsnag__ApiKey) !== null && _a !== void 0 ? _a : stageSettings.Bugsnag.ApiKey) !== null &&
  _b !== void 0
    ? _b
    : baseSettings.Bugsnag.ApiKey;
const bugsnagReleaseStage =
  (_d =
    (_c = process.env.Bugsnag__ReleaseStage) !== null && _c !== void 0 ? _c : stageSettings.Bugsnag.ReleaseStage) !==
    null && _d !== void 0
    ? _d
    : baseSettings.Bugsnag.ReleaseStage;
const dataAccessConnectionString =
  (_f =
    (_e = process.env.DataAccess__ConnectionString) !== null && _e !== void 0
      ? _e
      : stageSettings.DataAccess.ConnectionString) !== null && _f !== void 0
    ? _f
    : baseSettings.DataAccess.ConnectionString;
const siteId =
  (_h = (_g = process.env.Site__Id) !== null && _g !== void 0 ? _g : stageSettings.Site.Id) !== null && _h !== void 0
    ? _h
    : baseSettings.Site.Id;
const exceptionReporter = new exception_reporter_1.ExceptionReporter(bugsnagApiKey, bugsnagReleaseStage, version);
function reportError(...args) {
  console.error('Error from ShareDB server: ', ...args);
  exceptionReporter.report(args.toString());
}
// ShareDB sometimes reports errors as warnings
sharedb_1.default.logger.setMethods({ warn: reportError, error: reportError });
function runMigrations() {
  return __awaiter(this, void 0, void 0, function* () {
    const DBType = (0, metadata_db_1.MetadataDB)(sharedb_mongo_1.default);
    let server;
    try {
      const client = yield mongodb_1.MongoClient.connect(`${dataAccessConnectionString}/xforge`);
      const db = client.db();
      server = new realtime_server_1.default(
        siteId,
        false,
        true,
        new DBType(callback => callback(null, client)),
        new schema_version_repository_1.SchemaVersionRepository(db)
      );
      yield server.createIndexes(db);
      yield server.addValidationSchema(db);
      yield server.migrateIfNecessary();
    } finally {
      // The server closes the MongoDB client
      server === null || server === void 0 ? void 0 : server.close();
    }
  });
}
void runMigrations();
//# sourceMappingURL=migrator.js.map

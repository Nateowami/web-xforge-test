'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            }
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
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
exports.ResourceMonitor = void 0;
const promises_1 = require('fs/promises');
const json_sizeof_1 = require('json-sizeof');
const path = __importStar(require('path'));
const v8_1 = __importDefault(require('v8'));
const vm_1 = __importDefault(require('vm'));
function sizeof(obj) {
  if (obj == null) return 0;
  return (0, json_sizeof_1.jsonSizeOf)(obj);
}
/**
 * Monitors and reports on various memory usages. Reports on request, or optionally periodically.
 */
class ResourceMonitor {
  /** Singleton. */
  static get instance() {
    var _a;
    return (_a = ResourceMonitor._instance) !== null && _a !== void 0
      ? _a
      : (ResourceMonitor._instance = new ResourceMonitor());
  }
  constructor() {
    /** Agent objects being monitored. */
    this.agents = new Set();
    this.connections = new Set();
    const baseOutputPath = this.getOutputDir();
    this.heapInfoPath = path.join(baseOutputPath, 'heap-info.csv');
    this.connectionInfoPath = path.join(baseOutputPath, 'connection-info.csv');
    this.agentInfoPath = path.join(baseOutputPath, 'agent-info.csv');
    this.pubSubInfoPath = path.join(baseOutputPath, 'pubsub-info.csv');
    const minutes = 30;
    this.intervalMs = minutes * 60 * 1000;
  }
  /** Begin periodic recording. */
  start() {
    setInterval(() => void this.record(), this.intervalMs);
    void this.record();
  }
  startMonitoringConnection(connection) {
    if (this.connections.has(connection)) return;
    this.connections.add(connection);
  }
  stopMonitoringConnection(connection) {
    this.stopMonitoringAgentOnConnection(connection);
    this.connections.delete(connection);
  }
  monitorAgent(agent, stream) {
    if (this.agents.has(agent)) return;
    this.agents.add(agent);
    // When the agent's stream closes, stop monitoring the agent.
    stream.once('close', () => this.agents.delete(agent));
  }
  stopMonitoringAgentOnConnection(connection) {
    const conn = connection;
    const agent = conn.agent;
    if (agent == null) return;
    this.agents.delete(agent);
  }
  setPubSub(pubSub) {
    this.pubSub = pubSub;
  }
  /** Record current resource usage. */
  record() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.recordHeapUsage();
      yield this.recordConnectionDiagnostics();
      yield this.recordAgentDiagnostics();
      yield this.recordPubSubDiagnostics();
    });
  }
  recordConnectionDiagnostics() {
    return __awaiter(this, void 0, void 0, function* () {
      const connections = Array.from(this.connections.values());
      const report = connections.map(connection => this.reportOnConnection(connection));
      yield this.saveToCsv(this.connectionInfoPath, report);
    });
  }
  recordAgentDiagnostics() {
    return __awaiter(this, void 0, void 0, function* () {
      const report = Array.from(this.agents.values()).map(agent => this.reportOnAgent(agent));
      yield this.saveToCsv(this.agentInfoPath, report);
    });
  }
  recordPubSubDiagnostics() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.pubSub === undefined) return;
      const report = this.reportOnPubSub(this.pubSub);
      yield this.saveToCsv(this.pubSubInfoPath, [report]);
    });
  }
  reportOnConnection(connection) {
    const conn = connection;
    const report = {
      timestamp: new Date().toISOString(),
      id: conn.id,
      collectionsDocsCount: Object.values(conn.collections).reduce(
        (count, docs) => count + Object.keys(docs).length,
        0
      ),
      // Just measure data items to avoid circular reference.
      collectionsDocsBytes: Object.values(conn.collections).reduce(
        (collectionsBytes, coll) =>
          collectionsBytes + Object.values(coll).reduce((docsBytes, doc) => docsBytes + sizeof(doc.data), 0),
        0
      ),
      queriesCount: Object.keys(conn.queries).length,
      // Avoid circular reference.
      queriesBytes: Object.values(conn.queries).reduce((totalBytes, query) => totalBytes + sizeof(query.results), 0),
      presencesCount: Object.keys(conn._presences).length,
      snapshotRequestsCount: Object.keys(conn._snapshotRequests).length
    };
    return report;
  }
  reportOnAgent(agent) {
    var _a;
    const ag = agent;
    // QueryEmitter has a circular reference and so we can not use sizeof. Substitute in a sum of the interesting
    // field sizes.
    const subscribedQueriesBytes = Object.values(ag.subscribedQueries).reduce(
      (sum, queryEmitter) => sum + sizeof(queryEmitter.query) + sizeof(queryEmitter.streams),
      0
    );
    const agentInfo = {
      timestamp: new Date().toISOString(),
      src: ag.src,
      clientId: ag.clientId,
      connectTime: ag.connectTime,
      connectSessionUserId: (_a = ag.connectSession) === null || _a === void 0 ? void 0 : _a.userId,
      subscribedDocsCount: Object.keys(ag.subscribedDocs).length,
      subscribedDocsBytes: sizeof(ag.subscribedDocs),
      subscribedPresencesCount: Object.keys(ag.subscribedPresences).length,
      subscribedPresencesBytes: sizeof(ag.subscribedPresences),
      subscribedQueriesCount: Object.keys(ag.subscribedQueries).length,
      subscribedQueriesBytes
    };
    return agentInfo;
  }
  reportOnPubSub(pubsub) {
    const ps = pubsub;
    const pubsubInfo = {
      timestamp: new Date().toISOString(),
      nextStreamId: ps.nextStreamId,
      streamsCount: ps.streamsCount,
      streamsBytes: sizeof(ps.streams),
      subscribedCount: Object.keys(ps.subscribed).length,
      subscribedBytes: sizeof(ps.subscribed)
    };
    return pubsubInfo;
  }
  recordHeapUsage() {
    return __awaiter(this, void 0, void 0, function* () {
      // Measuring memory is more meaningful if garbage collection runs first. The NodeJS process must be started with
      // --expose-gc for this to work. Or we can temporarily switch it on and run gc, but with a context
      // [workaround](https://github.com/nodejs/node/issues/16595).
      v8_1.default.setFlagsFromString('--expose-gc');
      vm_1.default.runInNewContext('gc')();
      v8_1.default.setFlagsFromString('--noexpose-gc');
      const memoryUsage = process.memoryUsage();
      const data = {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        runtimeS: Math.floor(process.uptime()),
        rssBytes: memoryUsage.rss,
        heapTotalBytes: memoryUsage.heapTotal,
        heapUsedBytes: memoryUsage.heapUsed,
        externalBytes: memoryUsage.external,
        arrayBuffersBytes: memoryUsage.arrayBuffers,
        availableMemoryBytes: process.availableMemory()
      };
      yield this.saveToCsv(this.heapInfoPath, [data]);
    });
  }
  /** Write data to a CSV file. If needed, create header row from the data's objects' keys. */
  saveToCsv(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
      if (data.length === 0) return;
      try {
        const dirPath = path.dirname(filePath);
        yield (0, promises_1.mkdir)(dirPath, { recursive: true });
        const fieldNames = Object.keys(data[0]);
        const columnHeadings = fieldNames.join(',');
        const dataRows = data.map(item => {
          return fieldNames.map(field => item[field]).join(',');
        });
        // Create the file with headers.
        try {
          yield (0, promises_1.writeFile)(filePath, columnHeadings + '\n', { flag: 'wx' });
        } catch (_a) {
          // The file already exists, so we did not write headers. Or there was another problem.
        }
        // Append to an existing file.
        yield (0, promises_1.appendFile)(filePath, dataRows.join('\n') + '\n', { flag: 'a' });
      } catch (error) {
        console.error(`Ignoring error writing to ${filePath}:`, error);
      }
    });
  }
  getOutputDir() {
    const requestedPath = process.env['SF_RESOURCE_REPORTS_PATH'];
    if (this.isStringPopulated(requestedPath)) return requestedPath;
    const reportDirName = 'sf-resource-reports';
    let xdgDataDir = process.env['XDG_DATA_HOME'];
    if (this.isStringPopulated(xdgDataDir)) return path.join(xdgDataDir, reportDirName);
    const home = process.env['HOME'];
    if (this.isStringPopulated(home)) {
      xdgDataDir = path.join(home, '.local', 'share');
      return path.join(xdgDataDir, reportDirName);
    }
    return path.join(process.cwd(), reportDirName);
  }
  isStringPopulated(value) {
    return value != null && value !== '';
  }
}
exports.ResourceMonitor = ResourceMonitor;
//# sourceMappingURL=resource-monitor.js.map

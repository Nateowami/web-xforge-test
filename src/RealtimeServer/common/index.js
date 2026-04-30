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
const json0_ot_diff_1 = __importDefault(require('json0-ot-diff'));
const mongodb_1 = require('mongodb');
const OTJson0 = __importStar(require('ot-json0'));
const RichText = __importStar(require('rich-text'));
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_milestone_mongo_1 = __importDefault(require('sharedb-milestone-mongo'));
const sharedb_mongo_1 = __importDefault(require('sharedb-mongo'));
require('./diagnostics');
const exception_reporter_1 = require('./exception-reporter');
const metadata_db_1 = require('./metadata-db');
const resource_monitor_1 = require('./resource-monitor');
const schema_version_repository_1 = require('./schema-version-repository');
const web_socket_stream_listener_1 = require('./web-socket-stream-listener');
sharedb_1.default.types.register(RichText.type);
sharedb_1.default.types.register(OTJson0.type);
let server;
let streamListener;
let secureStreamListener;
const connections = new Map();
let connectionIndex = 0;
let running = false;
function startServer(options) {
  return __awaiter(this, void 0, void 0, function* () {
    if (running) {
      return;
    }
    const exceptionReporter = new exception_reporter_1.ExceptionReporter(
      options.bugsnagApiKey,
      options.releaseStage,
      options.version
    );
    function reportError(...args) {
      console.error('Error from ShareDB server: ', ...args);
      exceptionReporter.report(args.toString());
    }
    // ShareDB sometimes reports errors as warnings
    sharedb_1.default.logger.setMethods({ warn: reportError, error: reportError });
    try {
      const RealtimeServerType =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(`../${options.appModuleName}/realtime-server`).default;
      const DBType = (0, metadata_db_1.MetadataDB)(sharedb_mongo_1.default);
      const client = yield mongodb_1.MongoClient.connect(options.connectionString);
      const db = client.db();
      server = new RealtimeServerType(
        options.siteId,
        options.migrationsDisabled,
        options.dataValidationDisabled,
        new DBType(callback => callback(null, client)),
        new schema_version_repository_1.SchemaVersionRepository(db),
        new sharedb_milestone_mongo_1.default(options.connectionString)
      );
      yield server.createIndexes(db);
      yield server.addValidationSchema(db);
      streamListener = new web_socket_stream_listener_1.WebSocketStreamListener(
        options.audience,
        options.scope,
        options.authority,
        options.port,
        undefined,
        undefined,
        options.origin.split(';').filter(s => s !== ''),
        exceptionReporter
      );
      streamListener.listen(server);
      yield streamListener.start();
      // Open a secure port, if one was specified
      if (
        options.securePort !== 0 &&
        options.certificatePath != '' &&
        options.certificatePath != null &&
        options.privateKeyPath != '' &&
        options.privateKeyPath != null
      ) {
        secureStreamListener = new web_socket_stream_listener_1.WebSocketStreamListener(
          options.audience,
          options.scope,
          options.authority,
          options.securePort,
          options.certificatePath,
          options.privateKeyPath,
          options.origin.split(';').filter(s => s !== ''),
          exceptionReporter
        );
        secureStreamListener.listen(server);
        yield secureStreamListener.start();
      }
      running = true;
      console.log('Realtime Server started.');
    } catch (err) {
      stopServer();
      throw err;
    }
  });
}
function stopServer() {
  if (server != null) {
    server.close();
    server = undefined;
  }
  if (streamListener != null) {
    streamListener.stop();
    streamListener = undefined;
  }
  if (secureStreamListener != null) {
    secureStreamListener.stop();
    secureStreamListener = undefined;
  }
  if (running) {
    running = false;
    console.log('Realtime Server stopped.');
  }
}
function createSnapshot(doc) {
  return { version: doc.version, data: doc.data, id: doc.id };
}
function createSnapshots(docs) {
  return docs === null || docs === void 0
    ? void 0
    : docs.map(doc => {
        return { version: doc.version, data: doc.data, id: doc.id };
      });
}
function getDoc(handle, collection, id) {
  const conn = connections.get(handle);
  if (conn != null) {
    return conn.get(collection, id);
  }
  return undefined;
}
module.exports = {
  start: (callback, options) => {
    startServer(options)
      .then(() => callback(undefined, {}))
      .catch(err => callback(err));
  },
  stop: callback => {
    stopServer();
    callback(undefined, {});
  },
  isServerRunning: callback => {
    callback(undefined, !(server == null));
  },
  connect: (callback, userId) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const connection = server.connect(userId);
    connection.on('error', err => console.log(err));
    const index = connectionIndex++;
    connections.set(index, connection);
    resource_monitor_1.ResourceMonitor.instance.startMonitoringConnection(connection);
    callback(undefined, index);
  },
  disconnect: (callback, handle) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const conn = connections.get(handle);
    if (conn != null) {
      resource_monitor_1.ResourceMonitor.instance.stopMonitoringConnection(conn);
    }
    connections.delete(handle);
    callback(undefined, {});
  },
  createDoc: (callback, handle, collection, id, data, typeName, source) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const doc = getDoc(handle, collection, id);
    if (doc == null) {
      callback(new Error('Connection not found.'));
      return;
    }
    const options = {};
    doc.submitSource = source != null;
    if (source != null) {
      options.source = source;
    }
    doc.create(data, typeName, options, err => {
      if (source != null) {
        doc.submitSource = false;
      }
      callback(err, createSnapshot(doc));
    });
  },
  fetchDoc: (callback, handle, collection, id) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const doc = getDoc(handle, collection, id);
    if (doc == null) {
      callback(new Error('Connection not found.'));
      return;
    }
    doc.fetch(err => callback(err, createSnapshot(doc)));
  },
  fetchDocs: (callback, handle, collection, ids) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const conn = connections.get(handle);
    const query = { _id: { $in: ids } };
    conn === null || conn === void 0
      ? void 0
      : conn.createFetchQuery(collection, query, {}, (err, results) => callback(err, createSnapshots(results)));
  },
  fetchSnapshotByTimestamp: (callback, handle, collection, id, timestamp) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const conn = connections.get(handle);
    conn === null || conn === void 0
      ? void 0
      : conn.fetchSnapshotByTimestamp(collection, id, timestamp, (err, snapshot) => callback(err, snapshot));
  },
  getOps: (callback, collection, id) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    server.db.getOps(collection, id, 0, null, { metadata: true }, (err, ops) => callback(err, ops));
  },
  submitOp: (callback, handle, collection, id, ops, source) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const doc = getDoc(handle, collection, id);
    if (doc == null) {
      callback(new Error('Connection not found.'));
      return;
    }
    const options = {};
    doc.submitSource = source != null;
    if (source != null) {
      options.source = source;
    }
    doc.submitOp(ops, options, err => {
      if (source != null) {
        doc.submitSource = false;
      }
      callback(err, createSnapshot(doc));
    });
  },
  deleteDoc: (callback, handle, collection, id) => {
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const doc = getDoc(handle, collection, id);
    if (doc == null) {
      callback(new Error('Connection not found.'));
      return;
    }
    doc.del({}, err => callback(err, {}));
  },
  applyOp: (callback, typeName, data, ops) => {
    const type = sharedb_1.default.types.map[typeName];
    if (ops != null && type.normalize != null) {
      ops = type.normalize(ops);
    }
    data = type.apply(data, ops);
    callback(undefined, data);
  },
  replaceDoc: (callback, handle, collection, id, data, source) => {
    var _a, _b;
    // Ensure we can get the existing document
    if (server == null) {
      callback(new Error('Server not started.'));
      return;
    }
    const doc = getDoc(handle, collection, id);
    if (doc == null) {
      callback(new Error('Connection not found.'));
      return;
    }
    // Build the ops from a diff
    let ops;
    let hasOps;
    if (((_a = doc.type) === null || _a === void 0 ? void 0 : _a.name) == OTJson0.type.name) {
      // NOTE: We do not use diff-patch-match, as that may result in
      // op conflicts when ops are submitted from multiple sources.
      // diff-patch-match mutates the string, but we want to replace it.
      ops = (0, json0_ot_diff_1.default)(doc.data, data);
      hasOps = ops.length > 0;
    } else if (((_b = doc.type) === null || _b === void 0 ? void 0 : _b.name) == RichText.type.name) {
      ops = new RichText.Delta(doc.data.ops).diff(new RichText.Delta(data.ops));
      hasOps = ops.ops.length > 0;
    } else {
      callback(new Error('Unsupported document type.'));
      return;
    }
    // Submit the ops
    if (hasOps) {
      const options = {};
      doc.submitSource = source != null;
      if (source != null) {
        options.source = source;
      }
      doc.submitOp(ops, options, err => {
        if (source != null) {
          doc.submitSource = false;
        }
        callback(err, createSnapshot(doc));
      });
    } else {
      callback(null, createSnapshot(doc));
    }
  }
};
//# sourceMappingURL=index.js.map

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
exports.RealtimeServer = exports.XF_ROLE_CLAIM = exports.XF_USER_ID_CLAIM = void 0;
exports.submitMigrationOp = submitMigrationOp;
const ajv_1 = __importDefault(require('ajv'));
const ajv_bsontype_1 = __importDefault(require('ajv-bsontype'));
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_access_1 = __importDefault(require('sharedb-access'));
const client_1 = require('sharedb/lib/client');
const resource_monitor_1 = require('./resource-monitor');
const sharedb_utils_1 = require('./utils/sharedb-utils');
exports.XF_USER_ID_CLAIM = 'http://xforge.org/userid';
exports.XF_ROLE_CLAIM = 'http://xforge.org/role';
/**
 * This class extends the ShareDB connection class to preserve the migration version property in the request.
 */
class MigrationConnection extends client_1.Connection {
  sendOp(doc, op) {
    this._addDoc(doc);
    const message = {
      a: 'op',
      c: doc.collection,
      d: doc.id,
      v: doc.version,
      src: op.src,
      seq: op.seq
    };
    if (op.op != null) {
      message.op = op.op;
    }
    if (op.create != null) {
      message.create = op.create;
    }
    if (op.del != null) {
      message.del = op.del;
    }
    if (op.mv != null) {
      message.mv = op.mv;
    }
    if (doc.submitSource && op.source != null) {
      message.x = { source: op.source };
    }
    this.send(message);
  }
}
/**
 * This class extends the ShareDB agent class to preserve the migration version property from the request.
 * Note: Because this overrides behavior of ShareDB.Agent, when there are changes to ShareDB.Agent
 * this class may need to be updated.
 */
class MigrationAgent extends sharedb_1.default.Agent {
  _handleMessage(request, callback) {
    if (request.a === 'op') {
      const errMessage = this._checkRequest(request);
      if (errMessage != null) {
        callback({ code: 4000, message: errMessage });
        return;
      }
      // src can be provided if it is not the same as the current agent,
      // such as a resubmission after a reconnect, but it usually isn't needed
      const src = request.src || this._src();
      // c, d, and m arguments are intentionally undefined. These are set later
      const op = {
        src,
        seq: request.seq,
        v: request.v,
        mv: request.mv,
        x: request.x,
        c: undefined,
        d: undefined,
        m: undefined
      };
      if (request.op != null) {
        op.op = request.op;
      } else if (request.create != null) {
        op.create = request.create;
      } else if (request.del != null) {
        op.del = request.del;
      } else {
        callback({ code: 4000, message: 'Invalid op message' });
        return;
      }
      this._submit(request.c, request.d, op, callback);
    } else {
      super._handleMessage(request, callback);
    }
  }
}
/**
 * Submits a migration op to the specified doc.
 *
 * @param {number} version The migration version.
 * @param {Doc} doc The doc.
 * @param {Op[]} ops The ops.
 * @returns {Promise<void>}
 */
function submitMigrationOp(version, doc, ops) {
  if (ops.length === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const op = { op: ops, mv: version };
    doc._submit(op, undefined, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
/**
 * This class represents the real-time server. It extends ShareDB and adds support for migrations and access control.
 */
class RealtimeServer extends sharedb_1.default {
  constructor(
    siteId,
    migrationsDisabled,
    dataValidationDisabled,
    docServices,
    projectsCollection,
    db,
    schemaVersions,
    milestoneDb
  ) {
    super({
      db,
      milestoneDb,
      presence: true,
      disableDocAction: true,
      disableSpaceDelimitedActions: true,
      doNotForwardSendPresenceErrorsToClient: true
    });
    this.siteId = siteId;
    this.migrationsDisabled = migrationsDisabled;
    this.dataValidationDisabled = dataValidationDisabled;
    this.projectsCollection = projectsCollection;
    this.db = db;
    this.schemaVersions = schemaVersions;
    /* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */
    this.docServices = new Map();
    (0, sharedb_access_1.default)(this);
    this.use('connect', (context, done) => {
      context.stream.checkServerAccess = true;
      this.setConnectSession(context)
        .then(() => done())
        .catch(err => done(err));
    });
    // Configure op, snapshot, or milestone changes to be made just before the op is committed to the database
    this.use('commit', (context, callback) => {
      var _a;
      switch (context.collection) {
        case 'texts':
        case 'text_documents':
          // Save a milestone for texts, every 1000 ops (about 7-10 verses typed live)
          if (context.snapshot != null) {
            context.saveMilestoneSnapshot = context.snapshot.v % 1000 === 0;
          }
          // If a source was specified, and is a string, set this as metadata for the op
          // The source will reach the realtime server if submitSource was set to true for the document on the client
          if (typeof ((_a = context.extra) === null || _a === void 0 ? void 0 : _a.source) === 'string') {
            context.op.m.source = context.extra.source;
          }
          break;
        default:
          // Don't save any milestones for collections not named here.
          // IMPORTANT: We have to set this to false to actively disable milestones
          // If left to null, then the default interval will still apply
          context.saveMilestoneSnapshot = false;
      }
      callback();
    });
    for (const docService of docServices) {
      docService.init(this);
      this.docServices.set(docService.collection, docService);
    }
    // Setup Ajv
    const ajv = new ajv_1.default({ strict: false, allErrors: true, logger: false });
    (0, ajv_bsontype_1.default)(ajv);
    this.use('submit', (context, done) => {
      var _a, _b;
      context.op.c = context.collection;
      if (context.op.mv != null) {
        context.op.m.migration = context.op.mv;
        delete context.op.mv;
      }
      // Perform data validation, if enabled. It will be disabled during migration.
      // Also, do not validate if the connection is from the backend server - we can trust it
      const validationSchema =
        (_a = this.docServices.get(context.collection)) === null || _a === void 0 ? void 0 : _a.validationSchema;
      if (
        !this.dataValidationDisabled &&
        validationSchema != null &&
        context.op.op != null &&
        !context.agent.connectSession.isServer
      ) {
        let ops;
        if (Array.isArray(context.op.op)) {
          ops = context.op.op;
        } else {
          ops = [context.op.op];
        }
        // Iterate over every operation
        for (const op of ops) {
          // Skip operations with a null path as they will not be applied
          if (op.p == null) {
            continue;
          }
          let properties = validationSchema.properties;
          let patternProperties = false;
          // For each property name in the path array
          for (let i = 0; i < op.p.length; i++) {
            const propertyName = op.p[i];
            let propertySchema;
            // If we have a valid property in our schema matching the current path
            if (typeof propertyName === 'string' && properties != undefined) {
              if (properties[propertyName] !== undefined) {
                // If this property has more properties, set the properties to use with the next property in the path
                if (properties[propertyName].properties !== undefined) {
                  patternProperties = false;
                  // If we are not at the end of the path, iterate over the next path property name
                  if (i < op.p.length - 1) {
                    properties = properties[propertyName].properties;
                    continue;
                  } else {
                    // Use the schema for the items, as we are at the end of the path
                    propertySchema = properties[propertyName];
                  }
                } else if (properties[propertyName].items !== undefined) {
                  // This is an array - skip the indexer
                  i++;
                  patternProperties = false;
                  // If we are not at the end of the path, iterate over the next path property name
                  if (i < op.p.length - 1) {
                    properties =
                      (_b = properties[propertyName].items) === null || _b === void 0 ? void 0 : _b.properties;
                    continue;
                  } else if (i == op.p.length) {
                    // i is past the end of the array (i.e. there is no indexer), so we are replacing the array
                    propertySchema = properties[propertyName];
                  } else if (properties[propertyName].items !== undefined) {
                    // Use the schema for the items, as we are at the end of the path
                    propertySchema = properties[propertyName].items;
                  }
                } else if (properties[propertyName].patternProperties !== undefined && i < op.p.length - 1) {
                  // This is a map - check that the next property name matches the pattern
                  properties = properties[propertyName].patternProperties;
                  patternProperties = true;
                  continue;
                }
              }
              // Get the schema, by checking for the property name by pattern
              if (patternProperties) {
                for (const [key, value] of Object.entries(properties)) {
                  if (new RegExp(key).test(propertyName)) {
                    propertySchema = value;
                  }
                }
              }
              // No pattern matched, retrieve the schema by property name
              if (propertySchema === undefined) {
                propertySchema = properties[propertyName];
              }
              // If we still have no property schema, this is an invalid path
              if (propertySchema === undefined) {
                done(`Invalid path for operation: ${JSON.stringify(op)}`);
                return;
              }
              let newValue;
              if ('li' in op) {
                newValue = op.li;
              } else if ('oi' in op) {
                newValue = op.oi;
              } else if ('na' in op) {
                newValue = op.na;
              } else {
                // Op does not require checking, continue with the next op
                continue;
              }
              // Check type via bsonType
              let validData = false;
              let bsonTypes;
              if (Array.isArray(propertySchema.bsonType)) {
                bsonTypes = propertySchema.bsonType;
              } else if (typeof propertySchema.bsonType === 'string') {
                bsonTypes = [propertySchema.bsonType];
              } else {
                // No bson type, is valid
                bsonTypes = [];
                validData = true;
              }
              for (const bsonType of bsonTypes) {
                switch (bsonType) {
                  case 'number':
                  case 'int':
                  case 'double':
                  case 'long':
                  case 'decimal':
                    validData = typeof newValue === 'number';
                    break;
                  case 'bool':
                    validData = typeof newValue === 'boolean';
                    break;
                  case 'null':
                    validData = newValue == null;
                    break;
                  case 'string':
                    validData = typeof newValue === 'string';
                    // Check value for pattern
                    if (propertySchema.pattern != null) {
                      validData = new RegExp(propertySchema.pattern).test(newValue);
                    }
                    // Check for enum values
                    if (propertySchema.enum != null) {
                      validData = propertySchema.enum.includes(newValue);
                    }
                    break;
                  case 'object': {
                    const validate = ajv.compile(propertySchema);
                    validData = validate(newValue);
                    break;
                  }
                  default:
                    // This is a type we cannot check, so we assume the data is valid
                    validData = true;
                    break;
                }
                // We iterate over the bsonTypes until a valid value is found
                if (validData) {
                  break;
                }
              }
              if (!validData) {
                done(`Invalid operation data: ${JSON.stringify(op)}`);
                return;
              }
            } else {
              done(`Invalid path for operation: ${JSON.stringify(op)}`);
              return;
            }
          }
        }
      }
      done();
    });
    const origTransform = sharedb_1.default.ot.transform;
    sharedb_1.default.ot.transform = (type, op, appliedOp) => {
      if (op.c != null && op.v != null && appliedOp.m.migration != null) {
        const docService = this.docServices.get(op.c);
        const migration = docService.getMigration(appliedOp.m.migration);
        try {
          migration.migrateOp(op);
          op.v++;
        } catch (err) {
          return err;
        }
      } else {
        return origTransform(type, op, appliedOp);
      }
    };
    this.use('apply', (context, done) => {
      delete context.op.c;
      done();
    });
    this.defaultConnection = this.connect();
    if (!this.dataValidationDisabled) {
      resource_monitor_1.ResourceMonitor.instance.setPubSub(this.pubsub);
      resource_monitor_1.ResourceMonitor.instance.startMonitoringConnection(this.defaultConnection);
    }
  }
  addValidationSchema(db) {
    return __awaiter(this, void 0, void 0, function* () {
      for (const docService of this.docServices.values()) {
        yield docService.addValidationSchema(db);
      }
    });
  }
  createIndexes(db) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.schemaVersions.createIndex();
      for (const docService of this.docServices.values()) {
        yield docService.createIndexes(db);
      }
    });
  }
  connect(connectionOrUserId, req) {
    let connection;
    if (connectionOrUserId instanceof client_1.Connection) {
      connection = connectionOrUserId;
    } else {
      // Temporary socket that is used in constructing the Connection, but quickly replaced with a new socket in ShareDB
      // backend.js connect().
      const tmpSocket = {
        close: () => {
          // do nothing
        }
      };
      connection = new MigrationConnection(tmpSocket);
      if (connectionOrUserId != null) {
        req = { userId: connectionOrUserId };
      }
    }
    return super.connect(connection, req);
  }
  listen(stream, req) {
    // Streams of types WebSocketJSONStream and ServerStream are received by this method.
    const agent = new MigrationAgent(this, stream);
    if (!this.dataValidationDisabled) {
      resource_monitor_1.ResourceMonitor.instance.monitorAgent(agent, stream);
    }
    this.trigger('connect', agent, { stream, req }, err => {
      if (err) {
        return agent.close(err);
      }
      agent._open();
    });
    return agent;
  }
  getProject(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
      const projectDoc = this.defaultConnection.get(this.projectsCollection, projectId);
      yield (0, sharedb_utils_1.docFetch)(projectDoc);
      return projectDoc.data;
    });
  }
  migrateIfNecessary() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.migrationsDisabled) {
        return;
      }
      const versionMap = new Map();
      for (const schemaVersion of yield this.schemaVersions.getAll()) {
        versionMap.set(schemaVersion.collection, schemaVersion.version);
      }
      for (const docService of this.docServices.values()) {
        let curVersion = versionMap.get(docService.collection);
        curVersion !== null && curVersion !== void 0 ? curVersion : (curVersion = 0);
        const version = docService.schemaVersion;
        if (curVersion === version) {
          continue;
        }
        const limit = 10000;
        let skip = 0;
        let query = yield (0, sharedb_utils_1.createFetchQuery)(this.defaultConnection, docService.collection, {
          $sort: { _id: 1 },
          $skip: skip,
          $limit: limit
        });
        while (query.results.length > 0) {
          console.log(`Migrating ${docService.collection}: ${skip + 1} to ${skip + query.results.length}`);
          let docVersion = curVersion;
          while (docVersion < version) {
            docVersion++;
            const promises = [];
            const migration = docService.getMigration(docVersion);
            for (const doc of query.results) {
              promises.push(migration.migrateDoc(doc));
            }
            yield Promise.all(promises);
          }
          skip += limit;
          query = yield (0, sharedb_utils_1.createFetchQuery)(this.defaultConnection, docService.collection, {
            $sort: { _id: 1 },
            $skip: skip,
            $limit: limit
          });
        }
        yield this.schemaVersions.set(docService.collection, version);
      }
    });
  }
  setConnectSession(context) {
    return __awaiter(this, void 0, void 0, function* () {
      let session;
      if (context.req != null && context.req.user != null) {
        const userId = context.req.user[exports.XF_USER_ID_CLAIM];
        const role = context.req.user[exports.XF_ROLE_CLAIM];
        const roles = typeof role === 'string' ? [role] : role || [];
        session = {
          userId,
          roles,
          isServer: false
        };
      } else {
        let userId = '';
        if (context.req != null && context.req.userId != null) {
          userId = context.req.userId;
        }
        session = { isServer: true, userId, roles: [] };
      }
      context.agent.connectSession = session;
    });
  }
}
exports.RealtimeServer = RealtimeServer;
//# sourceMappingURL=realtime-server.js.map

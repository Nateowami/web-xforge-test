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
Object.defineProperty(exports, '__esModule', { value: true });
exports.DocService = void 0;
/**
 * This is the abstract base class for all doc services. Doc services are responsible for managing data for a
 * particular doc type.
 */
class DocService {
  constructor(migrations) {
    this.migrations = new Map();
    this.validationSchema = undefined;
    let maxVersion = 0;
    for (const migration of migrations) {
      maxVersion = Math.max(maxVersion, migration.VERSION);
      this.migrations.set(migration.VERSION, migration);
    }
    this.schemaVersion = maxVersion;
  }
  init(server) {
    this.server = server;
    server.allowCreate(this.collection, (docId, doc, session) => this.allowCreate(docId, doc, session));
    server.allowDelete(this.collection, (docId, doc, session) => this.allowDelete(docId, doc, session));
    server.allowRead(this.collection, (docId, doc, session) => this.allowRead(docId, doc, session));
    server.allowUpdate(this.collection, (docId, oldDoc, newDoc, ops, session) =>
      this.allowUpdate(docId, oldDoc, newDoc, ops, session)
    );
  }
  getMigration(version) {
    const MigrationType = this.migrations.get(version);
    if (MigrationType == null) {
      throw new Error('The specified migration is not registered.');
    }
    return new MigrationType();
  }
  createIndexes(db) {
    return __awaiter(this, void 0, void 0, function* () {
      for (const path of this.indexPaths) {
        const collection = db.collection(this.collection);
        if (typeof path === 'string') {
          yield collection.createIndex({ [path]: 1 });
        } else if (Array.isArray(path)) {
          yield collection.createIndex({ [path[0]]: 1 }, path[1]);
        } else {
          yield collection.createIndex(path);
        }
      }
    });
  }
  addValidationSchema(db) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.validationSchema != null) {
        const collectionExists = yield db.listCollections({ name: this.collection }).hasNext();
        if (!collectionExists) yield db.createCollection(this.collection);
        yield db.command({
          collMod: this.collection,
          validator: {
            $jsonSchema: this.validationSchema
          },
          validationAction: 'warn',
          validationLevel: 'strict'
        });
      }
    });
  }
  addUpdateListener(server, handler) {
    server.use('afterWrite', (context, callback) => {
      if (context.collection === this.collection) {
        handler(context.id, context.op.op)
          .then(() => callback())
          .catch(err => callback(err));
      } else {
        callback();
      }
    });
  }
  allowCreate(_docId, _doc, session) {
    return session.isServer;
  }
  allowDelete(_docId, _doc, session) {
    return session.isServer;
  }
  allowRead(_docId, _doc, session) {
    return session.isServer;
  }
  allowUpdate(_docId, _oldDoc, _newDoc, _ops, session) {
    return session.isServer;
  }
}
exports.DocService = DocService;
// This is a base schema that covers the minimum required properties for a ShareDB collection
// NOTE: Schemas that use this must implement the property "_id"
DocService.validationSchema = {
  bsonType: 'object',
  required: ['_id', '_type', '_v', '_m', '_o'],
  properties: {
    _type: {
      bsonType: ['null', 'string']
    },
    _v: {
      bsonType: 'int'
    },
    _m: {
      bsonType: 'object',
      required: ['ctime', 'mtime'],
      properties: {
        ctime: {
          bsonType: 'number'
        },
        mtime: {
          bsonType: 'number'
        },
        _create: {
          bsonType: 'object',
          required: ['src', 'seq', 'v'],
          properties: {
            src: {
              bsonType: 'string'
            },
            seq: {
              bsonType: 'number'
            },
            v: {
              bsonType: 'number'
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    _o: {
      bsonType: 'objectId'
    }
  }
};
//# sourceMappingURL=doc-service.js.map

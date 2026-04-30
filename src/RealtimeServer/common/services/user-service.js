'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserService = void 0;
const system_role_1 = require('../models/system-role');
const user_1 = require('../models/user');
const obj_path_1 = require('../utils/obj-path');
const json_doc_service_1 = require('./json-doc-service');
const user_migrations_1 = require('./user-migrations');
const USER_PROFILE_FIELDS = {
  displayName: true,
  avatarUrl: true
};
/**
 * This class manages user docs.
 */
class UserService extends json_doc_service_1.JsonDocService {
  constructor() {
    super(user_migrations_1.USER_MIGRATIONS);
    this.collection = user_1.USERS_COLLECTION;
    this.indexPaths = user_1.USER_INDEX_PATHS;
    this.immutableProps = [
      this.pathTemplate(u => u.authId),
      this.pathTemplate(u => u.paratextId),
      this.pathTemplate(u => u.roles),
      this.pathTemplate(u => u.avatarUrl),
      this.pathTemplate(u => u.email),
      this.pathTemplate(u => u.name),
      this.pathTemplate(u => u.sites, false),
      this.pathTemplate(u => u.sites[obj_path_1.ANY_KEY], false),
      this.pathTemplate(u => u.sites[obj_path_1.ANY_KEY].projects)
    ];
    this.validationSchema = {
      bsonType: json_doc_service_1.JsonDocService.validationSchema.bsonType,
      required: json_doc_service_1.JsonDocService.validationSchema.required,
      properties: Object.assign(Object.assign({}, json_doc_service_1.JsonDocService.validationSchema.properties), {
        _id: {
          bsonType: 'string',
          pattern: '^[0-9a-f]+$'
        },
        name: {
          bsonType: 'string'
        },
        email: {
          bsonType: 'string'
        },
        paratextId: {
          bsonType: 'string'
        },
        roles: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        isDisplayNameConfirmed: {
          bsonType: 'bool'
        },
        interfaceLanguage: {
          bsonType: 'string'
        },
        authId: {
          bsonType: 'string'
        },
        sites: {
          bsonType: 'object',
          properties: {
            sf: {
              bsonType: 'object',
              required: ['projects'],
              properties: {
                currentProjectId: {
                  bsonType: 'string'
                },
                projects: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'string'
                  }
                }
              }
            }
          }
        },
        displayName: {
          bsonType: 'string'
        },
        avatarUrl: {
          bsonType: 'string'
        }
      }),
      additionalProperties: false
    };
  }
  init(server) {
    server.addProjection(user_1.USER_PROFILES_COLLECTION, this.collection, USER_PROFILE_FIELDS);
    super.init(server);
  }
  allowRead(docId, doc, session) {
    if (session.isServer || session.roles.includes(system_role_1.SystemRole.SystemAdmin)) {
      return true;
    }
    if (docId === session.userId) {
      return true;
    }
    for (const key of Object.keys(doc)) {
      if (!Object.prototype.hasOwnProperty.call(USER_PROFILE_FIELDS, key)) {
        return false;
      }
    }
    return true;
  }
  allowUpdate(docId, _oldDoc, _newDoc, ops, session) {
    if (session.isServer || session.roles.includes(system_role_1.SystemRole.SystemAdmin)) {
      return true;
    }
    if (docId !== session.userId) {
      return false;
    }
    return this.checkImmutableProps(ops);
  }
}
exports.UserService = UserService;
//# sourceMappingURL=user-service.js.map

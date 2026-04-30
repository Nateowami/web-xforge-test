'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProjectService = void 0;
const system_role_1 = require('../models/system-role');
const json_doc_service_1 = require('./json-doc-service');
/**
 * This class contains all common functionality for managing project docs.
 */
class ProjectService extends json_doc_service_1.JsonDocService {
  constructor() {
    super(...arguments);
    this.immutableProps = [this.pathTemplate(p => p.name), this.pathTemplate(p => p.userRoles)];
  }
  allowRead(_docId, doc, session) {
    if (
      session.isServer ||
      session.roles.includes(system_role_1.SystemRole.ServalAdmin) ||
      session.roles.includes(system_role_1.SystemRole.SystemAdmin) ||
      Object.keys(doc).length === 0
    ) {
      return true;
    }
    return doc.userRoles != null && session.userId in doc.userRoles;
  }
  allowUpdate(_docId, _oldDoc, newDoc, ops, session) {
    if (session.isServer || session.roles.includes(system_role_1.SystemRole.SystemAdmin)) {
      return true;
    }
    const projectRole = newDoc.userRoles != null ? newDoc.userRoles[session.userId] : '';
    if (projectRole !== this.projectAdminRole) {
      return false;
    }
    return this.checkImmutableProps(ops);
  }
}
exports.ProjectService = ProjectService;
// This is static to aide with testing, and allow SFProjectService to utilize it
ProjectService.validationSchema = {
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
    rolePermissions: {
      bsonType: 'object',
      patternProperties: {
        '^[a-z_]+$': {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        }
      },
      additionalProperties: false
    },
    userRoles: {
      bsonType: 'object',
      patternProperties: {
        '^[0-9a-f]+$': {
          bsonType: 'string'
        }
      },
      additionalProperties: false
    },
    userPermissions: {
      bsonType: 'object',
      patternProperties: {
        '^[0-9a-f]+$': {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        }
      },
      additionalProperties: false
    },
    syncDisabled: {
      bsonType: 'bool'
    }
  }),
  additionalProperties: false
};
//# sourceMappingURL=project-service.js.map

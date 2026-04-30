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
exports.TextService = void 0;
const project_rights_1 = require('../../common/models/project-rights');
const doc_service_1 = require('../../common/services/doc-service');
const sf_project_rights_1 = require('../models/sf-project-rights');
const text_data_1 = require('../models/text-data');
const text_migrations_1 = require('./text-migrations');
/**
 * This class manages text docs.
 */
class TextService extends doc_service_1.DocService {
  constructor() {
    super(text_migrations_1.TEXT_MIGRATIONS);
    this.collection = text_data_1.TEXTS_COLLECTION;
    this.indexPaths = text_data_1.TEXT_INDEX_PATHS;
    this.validationSchema = {
      bsonType: doc_service_1.DocService.validationSchema.bsonType,
      required: doc_service_1.DocService.validationSchema.required,
      properties: Object.assign(Object.assign({}, doc_service_1.DocService.validationSchema.properties), {
        _id: {
          bsonType: 'string',
          pattern: '^[0-9a-f]+:[0-9A-Z]+:[0-9]+:target$'
        },
        ops: {
          bsonType: 'array',
          items: {
            bsonType: 'object'
          }
        }
      }),
      additionalProperties: false
    };
  }
  allowCreate(docId, doc, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer || Object.keys(doc).length === 0) {
        return true;
      }
      const project = yield this.getProject(docId);
      return project != null && this.hasRight(project, project_rights_1.Operation.Create, session.userId);
    });
  }
  allowRead(docId, doc, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer || Object.keys(doc).length === 0) {
        return true;
      }
      const project = yield this.getProject(docId);
      return project != null && this.hasRight(project, project_rights_1.Operation.View, session.userId);
    });
  }
  allowUpdate(docId, _oldDoc, _newDoc, _ops, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer) {
        return true;
      }
      const project = yield this.getProject(docId);
      return project != null && this.hasRight(project, project_rights_1.Operation.Edit, session.userId);
    });
  }
  hasRight(project, operation, userId) {
    return sf_project_rights_1.SF_PROJECT_RIGHTS.hasRight(
      project,
      userId,
      sf_project_rights_1.SFProjectDomain.Texts,
      operation
    );
  }
  getProject(docId) {
    if (this.server == null) {
      throw new Error('The doc service has not been initialized.');
    }
    const projectId = docId.split(':')[0];
    return this.server.getProject(projectId);
  }
}
exports.TextService = TextService;
//# sourceMappingURL=text-service.js.map

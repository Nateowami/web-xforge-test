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
exports.ProjectDataService = void 0;
const project_rights_1 = require('../models/project-rights');
const json_doc_service_1 = require('./json-doc-service');
/**
 * This is the abstract base class for all doc services that manage JSON0 project data.
 */
class ProjectDataService extends json_doc_service_1.JsonDocService {
  constructor(migrations) {
    super(migrations);
    this.immutableProps = [this.pathTemplate(pd => pd.projectRef), this.pathTemplate(pd => pd.ownerRef)];
    /**
     * Set this property to "true" in services that need to override "onInsert", "onUpdate", and "onDelete"
     */
    this.listenForUpdates = false;
    this.domains = this.setupDomains();
    this.domains.sort((a, b) => {
      if (a.pathTemplate.template.length > b.pathTemplate.template.length) {
        return -1;
      } else if (a.pathTemplate.template.length < b.pathTemplate.template.length) {
        return 1;
      } else {
        return 0;
      }
    });
  }
  init(server) {
    super.init(server);
    if (this.listenForUpdates) {
      // Middleware actions are described at https://github.com/share/sharedb/blob/master/docs/middleware/actions.md
      server.use('apply', (context, callback) => {
        if (context.collection === this.collection) {
          this.handleApply(context)
            .then(() => callback())
            .catch(err => callback(err));
        } else {
          callback();
        }
      });
      server.use('afterWrite', (context, callback) => {
        if (context.collection === this.collection) {
          this.handleAfterSubmit(context)
            .then(() => callback())
            .catch(err => callback(err));
        } else {
          callback();
        }
      });
    }
  }
  allowCreate(_docId, doc, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer) {
        return true;
      }
      if (this.server == null) {
        throw new Error('The doc service has not been initialized.');
      }
      const project = yield this.server.getProject(doc.projectRef);
      const domain = this.getUpdatedDomain([], doc);
      return (
        project != null &&
        domain != null &&
        this.hasRight(project, domain, project_rights_1.Operation.Create, session.userId, doc)
      );
    });
  }
  allowDelete(_docId, doc, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer) {
        return true;
      }
      if (this.server == null) {
        throw new Error('The doc service has not been initialized.');
      }
      const project = yield this.server.getProject(doc.projectRef);
      const domain = this.getUpdatedDomain([], doc);
      return (
        project != null &&
        domain != null &&
        this.hasRight(project, domain, project_rights_1.Operation.Delete, session.userId, doc)
      );
    });
  }
  allowRead(_docId, doc, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer || Object.keys(doc).length === 0) {
        return true;
      }
      if (this.server == null) {
        throw new Error('The doc service has not been initialized.');
      }
      const project = yield this.server.getProject(doc.projectRef);
      if (project == null) {
        return false;
      }
      for (const domain of this.getApplicableDomains(doc)) {
        if (!this.hasRight(project, domain, project_rights_1.Operation.View, session.userId, doc)) {
          return false;
        }
      }
      return true;
    });
  }
  allowUpdate(_docId, oldDoc, newDoc, ops, session) {
    return __awaiter(this, void 0, void 0, function* () {
      if (session.isServer) {
        return true;
      }
      if (this.server == null) {
        throw new Error('The doc service has not been initialized.');
      }
      const project = yield this.server.getProject(oldDoc.projectRef);
      if (project == null) {
        return false;
      }
      for (const op of ops) {
        const domain = this.getUpdatedDomain(op.p, newDoc);
        if (domain == null) {
          return false;
        }
        let checkImmutableProps = true;
        if (domain.pathTemplate.template.length < op.p.length) {
          // property update
          const entityPath = op.p.slice(0, domain.pathTemplate.template.length);
          const oldEntity = this.deepGet(entityPath, oldDoc);
          // Changing the deleted property should be treated as a delete operation
          let operation = project_rights_1.Operation.Edit;
          if (op.p[op.p.length - 1] === 'deleted') {
            operation = project_rights_1.Operation.Delete;
          }
          // if the entity doesn't exist in the old doc, then it must be inserted by a previous op that the user has a
          // right to perform, so we don't need to check this edit right
          if (oldEntity != null && !this.hasRight(project, domain, operation, session.userId, oldEntity)) {
            return false;
          }
        } else {
          const listOp = op;
          if (listOp.li != null && listOp.ld != null) {
            // replace
            if (!this.hasRight(project, domain, project_rights_1.Operation.Edit, session.userId, listOp.ld)) {
              return false;
            }
          } else if (listOp.li != null) {
            // create
            if (!this.hasRight(project, domain, project_rights_1.Operation.Create, session.userId, listOp.li)) {
              return false;
            }
            checkImmutableProps = false;
          } else if (listOp.ld != null) {
            // delete
            if (!this.hasRight(project, domain, project_rights_1.Operation.Delete, session.userId, listOp.ld)) {
              return false;
            }
            checkImmutableProps = false;
          }
        }
        if (checkImmutableProps) {
          if (!this.checkImmutableProps(op)) {
            return false;
          }
        }
      }
      return true;
    });
  }
  /**
   * Can be overriden to handle entity inserts. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the inserted entity.
   * @param {OwnedData} _entity The inserted entity.
   */
  onInsert(_userId, _docId, _projectDomain, _entity) {
    return Promise.resolve();
  }
  /**
   * Can be overriden to handle entity updates. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the updated entity.
   * @param {OwnedData} _entity The updated entity.
   */
  onUpdate(_userId, _docId, _projectDomain, _entity) {
    return Promise.resolve();
  }
  /**
   * Can be overriden to handle entity deletes. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the deleted entity.
   * @param {OwnedData} _entity The deleted entity.
   */
  onDelete(_userId, _docId, _projectDomain, _entity) {
    return Promise.resolve();
  }
  /**
   * Can be overriden to respond just before an entity is deleted. The "listenForUpdates" property must be set to
   * "true" in order for this method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the deleted entity.
   * @param {OwnedData} _entity The deleted entity.
   */
  onBeforeDelete(_userId, _docId, _projectDomain, _entity) {
    return Promise.resolve();
  }
  /**
   * Gets the applicable domains based on the properties in the entity.
   * @param _entity A noteThread or note.
   * @returns
   */
  getApplicableDomains(_entity) {
    return this.domains;
  }
  getUpdatedDomain(path, entity) {
    const domainConfigs = this.getApplicableDomains(entity);
    const index = this.getMatchingPathTemplate(
      domainConfigs.map(dc => dc.pathTemplate),
      path,
      entity
    );
    if (index !== -1) {
      return domainConfigs[index];
    }
    return undefined;
  }
  hasRight(project, domain, operation, userId, data) {
    return this.projectRights.hasRight(project, userId, domain.projectDomain, operation, data);
  }
  deepGet(path, obj) {
    let curValue = obj;
    for (const part of path) {
      if (curValue == null) {
        return undefined;
      }
      curValue = curValue[part];
    }
    return curValue;
  }
  handleApply(context) {
    return __awaiter(this, void 0, void 0, function* () {
      const connectSession = context.agent.connectSession;
      if (context.op.del != null) {
        const domain = this.getUpdatedDomain([], context.snapshot.data);
        if (domain != null) {
          yield this.onBeforeDelete(connectSession.userId, context.id, domain.projectDomain, context.snapshot.data);
        }
      }
    });
  }
  handleAfterSubmit(context) {
    return __awaiter(this, void 0, void 0, function* () {
      const connectSession = context.agent.connectSession;
      if (context.op.create != null) {
        const domain = this.getUpdatedDomain([], context.op.create.data);
        if (domain != null) {
          yield this.onInsert(connectSession.userId, context.id, domain.projectDomain, context.op.create.data);
        }
      } else if (context.op.del != null) {
        const domain = this.getUpdatedDomain([], context.snapshot.data);
        if (domain != null) {
          yield this.onDelete(connectSession.userId, context.id, domain.projectDomain, context.snapshot.data);
        }
      } else if (context.op.op != null) {
        for (const op of context.op.op) {
          const domain = this.getUpdatedDomain(op.p, context.snapshot.data);
          if (domain == null) {
            return;
          }
          if (domain.pathTemplate.template.length < op.p.length) {
            const entityPath = op.p.slice(0, domain.pathTemplate.template.length);
            const entity = this.deepGet(entityPath, context.snapshot.data);
            yield this.onUpdate(connectSession.userId, context.id, domain.projectDomain, entity);
          } else {
            const listOp = op;
            if (listOp.ld != null) {
              yield this.onDelete(connectSession.userId, context.id, domain.projectDomain, listOp.ld);
            }
            if (listOp.li != null) {
              yield this.onInsert(connectSession.userId, context.id, domain.projectDomain, listOp.li);
            }
          }
        }
      }
    });
  }
}
exports.ProjectDataService = ProjectDataService;
// NOTE: Schemas that use this must implement the property "_id"
ProjectDataService.validationSchema = {
  bsonType: json_doc_service_1.JsonDocService.validationSchema.bsonType,
  required: json_doc_service_1.JsonDocService.validationSchema.required,
  properties: Object.assign(Object.assign({}, json_doc_service_1.JsonDocService.validationSchema.properties), {
    projectRef: {
      bsonType: 'string',
      pattern: '^[0-9a-f]+$'
    },
    ownerRef: {
      bsonType: 'string',
      pattern: '^[0-9a-f]*$'
    }
  })
};
//# sourceMappingURL=project-data-service.js.map

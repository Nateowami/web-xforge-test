'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.JsonDocService = void 0;
const obj_path_1 = require('../utils/obj-path');
const doc_service_1 = require('./doc-service');
/**
 * This is the abstract base class for all doc services that manage JSON0 docs.
 */
class JsonDocService extends doc_service_1.DocService {
  constructor() {
    super(...arguments);
    /**
     * The object paths to the immutable properties in the JSON0 doc.
     */
    this.immutableProps = [];
  }
  pathTemplate(field, inherit = true) {
    return (0, obj_path_1.obj)().pathTemplate(field, inherit);
  }
  checkImmutableProps(ops, entity) {
    if (ops instanceof Array) {
      for (const op of ops) {
        if (this.getMatchingPathTemplate(this.immutableProps, op.p, entity) !== -1) {
          return false;
        }
      }
      return true;
    }
    return this.getMatchingPathTemplate(this.immutableProps, ops.p, entity) === -1;
  }
  getMatchingPathTemplate(pathTemplates, path, _entity) {
    for (let i = 0; i < pathTemplates.length; i++) {
      if (pathTemplates[i].matches(path)) {
        return i;
      }
    }
    return -1;
  }
}
exports.JsonDocService = JsonDocService;
//# sourceMappingURL=json-doc-service.js.map

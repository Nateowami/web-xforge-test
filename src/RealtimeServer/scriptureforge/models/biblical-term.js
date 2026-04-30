'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BIBLICAL_TERM_INDEX_PATHS = exports.BIBLICAL_TERM_COLLECTION = void 0;
exports.getBiblicalTermDocId = getBiblicalTermDocId;
const project_data_1 = require('../../common/models/project-data');
const obj_path_1 = require('../../common/utils/obj-path');
exports.BIBLICAL_TERM_COLLECTION = 'biblical_terms';
exports.BIBLICAL_TERM_INDEX_PATHS = [
  ...project_data_1.PROJECT_DATA_INDEX_PATHS,
  // Index for SFProjectService.queryBiblicalTerms()
  {
    [(0, obj_path_1.obj)().pathStr(n => n.projectRef)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.references)]: 1
  }
];
function getBiblicalTermDocId(projectId, dataId) {
  return `${projectId}:${dataId}`;
}
//# sourceMappingURL=biblical-term.js.map

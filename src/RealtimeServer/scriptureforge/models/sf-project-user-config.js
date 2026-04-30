'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SF_PROJECT_USER_CONFIG_INDEX_PATHS = exports.SF_PROJECT_USER_CONFIGS_COLLECTION = void 0;
exports.getSFProjectUserConfigDocId = getSFProjectUserConfigDocId;
const project_data_1 = require('../../common/models/project-data');
exports.SF_PROJECT_USER_CONFIGS_COLLECTION = 'sf_project_user_configs';
exports.SF_PROJECT_USER_CONFIG_INDEX_PATHS = project_data_1.PROJECT_DATA_INDEX_PATHS;
function getSFProjectUserConfigDocId(projectId, userId) {
  return `${projectId}:${userId}`;
}
//# sourceMappingURL=sf-project-user-config.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TRAINING_DATA_INDEX_PATHS = exports.TRAINING_DATA_COLLECTION = void 0;
exports.getTrainingDataId = getTrainingDataId;
const project_data_1 = require('../../common/models/project-data');
exports.TRAINING_DATA_COLLECTION = 'training_data';
exports.TRAINING_DATA_INDEX_PATHS = project_data_1.PROJECT_DATA_INDEX_PATHS;
function getTrainingDataId(projectId, dataId) {
  return `${projectId}:${dataId}`;
}
//# sourceMappingURL=training-data.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.QUESTION_INDEX_PATHS = exports.QUESTIONS_COLLECTION = void 0;
exports.getQuestionDocId = getQuestionDocId;
const project_data_1 = require('../../common/models/project-data');
const obj_path_1 = require('../../common/utils/obj-path');
exports.QUESTIONS_COLLECTION = 'questions';
exports.QUESTION_INDEX_PATHS = [
  ...project_data_1.PROJECT_DATA_INDEX_PATHS,
  // Index for CheckingQuestionsService.queryQuestions() and CheckingQuestionsService.queryAdjacentQuestions()
  {
    [(0, obj_path_1.obj)().pathStr(n => n.projectRef)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.isArchived)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.verseRef.bookNum)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.verseRef.chapterNum)]: 1
  }
];
function getQuestionDocId(projectId, questionId) {
  return `${projectId}:${questionId}`;
}
//# sourceMappingURL=question.js.map

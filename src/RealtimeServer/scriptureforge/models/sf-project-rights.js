'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SF_PROJECT_RIGHTS = exports.SFProjectRights = exports.SFProjectDomain = void 0;
const project_rights_1 = require('../../common/models/project-rights');
const rightsByRole_json_1 = __importDefault(require('../rightsByRole.json'));
var SFProjectDomain;
(function (SFProjectDomain) {
  SFProjectDomain['Texts'] = 'texts';
  SFProjectDomain['Project'] = 'project';
  SFProjectDomain['ProjectUserConfigs'] = 'project_user_configs';
  SFProjectDomain['Questions'] = 'questions';
  SFProjectDomain['Answers'] = 'answers';
  SFProjectDomain['AnswerComments'] = 'answer_comments';
  SFProjectDomain['AnswerStatus'] = 'answer_status';
  SFProjectDomain['Likes'] = 'likes';
  SFProjectDomain['BiblicalTerms'] = 'biblical_terms';
  SFProjectDomain['PTNoteThreads'] = 'pt_note_threads';
  SFProjectDomain['SFNoteThreads'] = 'sf_note_threads';
  SFProjectDomain['Notes'] = 'notes';
  SFProjectDomain['TextAudio'] = 'text_audio';
  SFProjectDomain['TextDocuments'] = 'text_documents';
  SFProjectDomain['TrainingData'] = 'training_data';
  SFProjectDomain['Drafts'] = 'drafts';
  SFProjectDomain['UserInvites'] = 'user_invites';
})(SFProjectDomain || (exports.SFProjectDomain = SFProjectDomain = {}));
class SFProjectRights extends project_rights_1.ProjectRights {
  constructor() {
    super();
    // See https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
    // Domain is marked optional because each role does not need to list the domains exhaustively
    for (const [role, rights] of Object.entries(rightsByRole_json_1.default)) {
      const rightsForRole = [];
      for (const [domain, operations] of Object.entries(rights)) {
        for (const operation of operations) rightsForRole.push([domain, operation]);
      }
      this.addRights(role, rightsForRole);
    }
  }
}
exports.SFProjectRights = SFProjectRights;
exports.SF_PROJECT_RIGHTS = new SFProjectRights();
//# sourceMappingURL=sf-project-rights.js.map

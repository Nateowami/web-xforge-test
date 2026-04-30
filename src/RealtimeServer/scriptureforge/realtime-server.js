'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const project_rights_1 = require('../common/models/project-rights');
const realtime_server_1 = require('../common/realtime-server');
const user_service_1 = require('../common/services/user-service');
const note_thread_1 = require('./models/note-thread');
const sf_project_1 = require('./models/sf-project');
const sf_project_rights_1 = require('./models/sf-project-rights');
const biblical_term_service_1 = require('./services/biblical-term-service');
const note_thread_service_1 = require('./services/note-thread-service');
const question_service_1 = require('./services/question-service');
const sf_project_migrations_1 = require('./services/sf-project-migrations');
const sf_project_service_1 = require('./services/sf-project-service');
const sf_project_user_config_migrations_1 = require('./services/sf-project-user-config-migrations');
const sf_project_user_config_service_1 = require('./services/sf-project-user-config-service');
const text_audio_service_1 = require('./services/text-audio-service');
const text_document_service_1 = require('./services/text-document-service');
const text_service_1 = require('./services/text-service');
const training_data_service_1 = require('./services/training-data-service');
const SF_DOC_SERVICES = [
  new user_service_1.UserService(),
  new sf_project_service_1.SFProjectService(sf_project_migrations_1.SF_PROJECT_MIGRATIONS),
  new sf_project_user_config_service_1.SFProjectUserConfigService(
    sf_project_user_config_migrations_1.SF_PROJECT_USER_CONFIG_MIGRATIONS
  ),
  new text_service_1.TextService(),
  new question_service_1.QuestionService(),
  new biblical_term_service_1.BiblicalTermService(),
  new note_thread_service_1.NoteThreadService(),
  new text_audio_service_1.TextAudioService(),
  new text_document_service_1.TextDocumentService(),
  new training_data_service_1.TrainingDataService()
];
/**
 * This class represents the SF real-time server.
 */
class SFRealtimeServer extends realtime_server_1.RealtimeServer {
  constructor(siteId, migrationsDisabled, dataValidationDisabled, db, schemaVersions, milestoneDb) {
    super(
      siteId,
      migrationsDisabled,
      dataValidationDisabled,
      SF_DOC_SERVICES,
      sf_project_1.SF_PROJECTS_COLLECTION,
      db,
      schemaVersions,
      milestoneDb
    );
    this.use('query', (context, next) => {
      if (context.collection === note_thread_1.NOTE_THREAD_COLLECTION) {
        if (context.agent.connectSession.isServer) {
          next();
          return;
        }
        const userId = context.agent.connectSession.userId;
        this.getProject(context.query.projectRef)
          .then(p => {
            if (
              p != null &&
              !sf_project_rights_1.SF_PROJECT_RIGHTS.hasRight(
                p,
                userId,
                sf_project_rights_1.SFProjectDomain.PTNoteThreads,
                project_rights_1.Operation.View
              ) &&
              sf_project_rights_1.SF_PROJECT_RIGHTS.hasRight(
                p,
                userId,
                sf_project_rights_1.SFProjectDomain.SFNoteThreads,
                project_rights_1.Operation.View
              )
            ) {
              context.query = Object.assign(Object.assign({}, context.query), { publishedToSF: true });
            }
            next();
          })
          .catch(err => next(err));
      } else {
        next();
      }
    });
  }
}
exports.default = SFRealtimeServer;
//# sourceMappingURL=realtime-server.js.map

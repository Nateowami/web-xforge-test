import { ProjectRights } from '../../common/models/project-rights';
export declare enum SFProjectDomain {
  Texts = 'texts',
  Project = 'project',
  ProjectUserConfigs = 'project_user_configs',
  Questions = 'questions',
  Answers = 'answers',
  AnswerComments = 'answer_comments',
  AnswerStatus = 'answer_status',
  Likes = 'likes',
  BiblicalTerms = 'biblical_terms',
  PTNoteThreads = 'pt_note_threads',
  SFNoteThreads = 'sf_note_threads',
  Notes = 'notes',
  TextAudio = 'text_audio',
  TextDocuments = 'text_documents',
  TrainingData = 'training_data',
  Drafts = 'drafts',
  UserInvites = 'user_invites'
}
export declare class SFProjectRights extends ProjectRights {
  constructor();
}
export declare const SF_PROJECT_RIGHTS: SFProjectRights;

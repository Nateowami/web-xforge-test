'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AssignedUsers =
  exports.NoteConflictType =
  exports.NoteType =
  exports.NoteStatus =
  exports.NOTE_THREAD_INDEX_PATHS =
  exports.NOTE_THREAD_COLLECTION =
    void 0;
exports.getNoteThreadDocId = getNoteThreadDocId;
const project_data_1 = require('../../common/models/project-data');
const obj_path_1 = require('../../common/utils/obj-path');
exports.NOTE_THREAD_COLLECTION = 'note_threads';
exports.NOTE_THREAD_INDEX_PATHS = [
  ...project_data_1.PROJECT_DATA_INDEX_PATHS,
  // Index for SFProjectService.queryNoteThreads()
  {
    [(0, obj_path_1.obj)().pathStr(n => n.projectRef)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.status)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.verseRef.bookNum)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.verseRef.chapterNum)]: 1
  },
  // Index for SFProjectService.queryBiblicalTermNoteThreads()
  {
    [(0, obj_path_1.obj)().pathStr(n => n.projectRef)]: 1,
    [(0, obj_path_1.obj)().pathStr(n => n.biblicalTermId)]: 1
  }
];
/**
 * Note status, mimicking PT CommentList.cs.
 * Paratext used to record notes as deleted when completed but then changed to display them as resolved.
 * Done is also a backwards compatible status that could also be treated as deleted/resolved.
 */
var NoteStatus;
(function (NoteStatus) {
  NoteStatus['Unspecified'] = '';
  NoteStatus['Todo'] = 'todo';
  NoteStatus['Done'] = 'done';
  NoteStatus['Resolved'] = 'deleted';
})(NoteStatus || (exports.NoteStatus = NoteStatus = {}));
/** Note type, mimicking PT CommentList.cs.
 *  Note that this enum does not list Unspecified, since the PT API says that is for use in filters and that notes
 * should never be created with that type.
 */
var NoteType;
(function (NoteType) {
  NoteType['Normal'] = '';
  NoteType['Conflict'] = 'conflict';
})(NoteType || (exports.NoteType = NoteType = {}));
/** Type of conflict from a merge, mimicking PT CommentList.cs. Note that in PT, an additional item is `None`, which
 * is null. Also note that the default value is "unknownConflictType", which is present in Note XML files when the note
 * is not a conflict note. */
var NoteConflictType;
(function (NoteConflictType) {
  NoteConflictType['VerseTextConflict'] = 'verseText';
  NoteConflictType['InvalidVerses'] = 'invalidVerses';
  NoteConflictType['VerseBridgeDifferences'] = 'verseBridge';
  NoteConflictType['DuplicateVerses'] = 'duplicateVerses';
  NoteConflictType['ReadError'] = 'readError';
  NoteConflictType['VerseOrderError'] = 'verseOrder';
  NoteConflictType['StudyBibleChangeConflict'] = 'studyBibleChangeConflict';
  NoteConflictType['StudyBibleOverlappingChanges'] = 'studyBibleOverlappingChanges';
  NoteConflictType['StudyBibleChangeDeleteConflict'] = 'studyBibleChangeDeleteConflict';
  /** This is not part of the PT enum, but is the default value. */
  NoteConflictType['DefaultValue'] = 'unknownConflictType';
})(NoteConflictType || (exports.NoteConflictType = NoteConflictType = {}));
function getNoteThreadDocId(projectId, dataId) {
  return `${projectId}:${dataId}`;
}
var AssignedUsers;
(function (AssignedUsers) {
  AssignedUsers['Unspecified'] = '';
  AssignedUsers['TeamUser'] = 'Team';
})(AssignedUsers || (exports.AssignedUsers = AssignedUsers = {}));
//# sourceMappingURL=note-thread.js.map

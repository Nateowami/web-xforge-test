import { PROJECT_DATA_INDEX_PATHS, ProjectData } from '../../common/models/project-data';
import { obj } from '../../common/utils/obj-path';
import { BiblicalTermNoteHeadingInfo } from './biblical-term-note-heading-info';
import { Note } from './note';
import { TextAnchor } from './text-anchor';
import { VerseRefData } from './verse-ref-data';

export const NOTE_THREAD_COLLECTION = 'note_threads';
export const NOTE_THREAD_INDEX_PATHS = [
  ...PROJECT_DATA_INDEX_PATHS,
  // Index for SFProjectService.queryNoteThreads()
  {
    [obj<NoteThread>().pathStr(n => n.projectRef)]: 1,
    [obj<NoteThread>().pathStr(n => n.status)]: 1,
    [obj<NoteThread>().pathStr(n => n.verseRef.bookNum)]: 1,
    [obj<NoteThread>().pathStr(n => n.verseRef.chapterNum)]: 1
  },
  // Index for SFProjectService.queryBiblicalTermNoteThreads()
  {
    [obj<NoteThread>().pathStr(n => n.projectRef)]: 1,
    [obj<NoteThread>().pathStr(n => n.biblicalTermId)]: 1
  }
];

/**
 * Note status, mimicking PT CommentList.cs.
 * Paratext used to record notes as deleted when completed but then changed to display them as resolved.
 * Done is also a backwards compatible status that could also be treated as deleted/resolved.
 */
export enum NoteStatus {
  Unspecified = '',
  Todo = 'todo',
  Done = 'done',
  Resolved = 'deleted'
}

/** Note type, mimicking PT CommentList.cs.
 *  Note that this enum does not list Unspecified, since the PT API says that is for use in filters and that notes
 * should never be created with that type.
 */
export enum NoteType {
  Normal = '',
  Conflict = 'conflict'
}

/** Type of conflict from a merge, mimicking PT CommentList.cs. Note that in PT, an additional item is `None`, which
 * is null. Also note that the default value is "unknownConflictType", which is present in Note XML files when the note
 * is not a conflict note. */
export enum NoteConflictType {
  VerseTextConflict = 'verseText',
  InvalidVerses = 'invalidVerses',
  VerseBridgeDifferences = 'verseBridge',
  DuplicateVerses = 'duplicateVerses',
  ReadError = 'readError',
  VerseOrderError = 'verseOrder',
  StudyBibleChangeConflict = 'studyBibleChangeConflict',
  StudyBibleOverlappingChanges = 'studyBibleOverlappingChanges',
  StudyBibleChangeDeleteConflict = 'studyBibleChangeDeleteConflict',
  /** This is not part of the PT enum, but is the default value. */
  DefaultValue = 'unknownConflictType'
}

export function getNoteThreadDocId(projectId: string, dataId: string): string {
  return `${projectId}:${dataId}`;
}

export enum AssignedUsers {
  Unspecified = '',
  TeamUser = 'Team'
}

export interface NoteThread extends ProjectData {
  dataId: string;
  threadId: string;
  verseRef: VerseRefData;
  notes: Note[];
  originalSelectedText: string;
  originalContextBefore: string;
  originalContextAfter: string;
  position: TextAnchor;
  status: NoteStatus;
  publishedToSF?: boolean;
  assignment?: string;
  biblicalTermId?: string;
  extraHeadingInfo?: BiblicalTermNoteHeadingInfo;
}

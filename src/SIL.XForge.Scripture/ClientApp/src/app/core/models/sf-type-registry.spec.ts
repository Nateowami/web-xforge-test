import { environment } from '../../../environments/environment';
import { getIndexes } from '../../../xforge-common/indexeddb-offline-store';
import { SF_TYPE_REGISTRY } from './sf-type-registry';

/**
 * The IndexedDB object stores and indexes that the offline database has at {@link EXPECTED_OFFLINE_DB_VERSION}.
 *
 * Existing offline databases only get new object stores and index changes when they are upgraded. If this test fails
 * because a realtime doc type or its INDEX_PATHS changed (these are often defined in the RealtimeServer models),
 * increment offlineDBVersion in every environment file, then update EXPECTED_OFFLINE_DB_VERSION and this schema.
 */
const EXPECTED_SCHEMA: { [store: string]: { [index: string]: string | string[] } } = {
  users: {
    email: 'data.email',
    paratextId: 'data.paratextId'
  },
  user_profiles: {},
  sf_projects: {
    name: 'data.name',
    paratextId: 'data.paratextId',
    shortName: 'data.shortName',
    'translateConfig.source.projectRef': 'data.translateConfig.source.projectRef',
    'translateConfig.draftConfig.draftingSources.projectRef':
      'data.translateConfig.draftConfig.draftingSources.projectRef',
    'translateConfig.draftConfig.trainingSources.projectRef':
      'data.translateConfig.draftConfig.trainingSources.projectRef'
  },
  sf_projects_profile: {},
  sf_project_user_configs: {
    projectRef: 'data.projectRef'
  },
  biblical_terms: {
    projectRef: 'data.projectRef',
    projectRef_references: ['data.projectRef', 'data.references']
  },
  questions: {
    projectRef: 'data.projectRef',
    'projectRef_isArchived_verseRef.bookNum_verseRef.chapterNum': [
      'data.projectRef',
      'data.isArchived',
      'data.verseRef.bookNum',
      'data.verseRef.chapterNum'
    ],
    'projectRef_verseRef.bookNum_verseRef.chapterNum': [
      'data.projectRef',
      'data.verseRef.bookNum',
      'data.verseRef.chapterNum'
    ]
  },
  texts: {},
  note_threads: {
    projectRef: 'data.projectRef',
    'projectRef_status_verseRef.bookNum_verseRef.chapterNum': [
      'data.projectRef',
      'data.status',
      'data.verseRef.bookNum',
      'data.verseRef.chapterNum'
    ],
    projectRef_biblicalTermId: ['data.projectRef', 'data.biblicalTermId']
  },
  text_audio: {
    projectRef: 'data.projectRef'
  },
  training_data: {
    projectRef: 'data.projectRef'
  },
  audio: {},
  'training-data': {},
  edited_segments: {}
};
const EXPECTED_OFFLINE_DB_VERSION = 9;

describe('SF_TYPE_REGISTRY', () => {
  it('only changes the offline database schema when the offline DB version changes', () => {
    const schema: { [store: string]: { [index: string]: string | string[] } } = {};
    for (const docType of SF_TYPE_REGISTRY.docTypes) {
      schema[docType.COLLECTION] = Object.fromEntries(getIndexes(docType.INDEX_PATHS));
    }
    for (const store of [...SF_TYPE_REGISTRY.fileTypes, ...SF_TYPE_REGISTRY.customTypes]) {
      schema[store] = {};
    }

    expect({ offlineDBVersion: environment.offlineDBVersion, schema }).toEqual({
      offlineDBVersion: EXPECTED_OFFLINE_DB_VERSION,
      schema: EXPECTED_SCHEMA
    });
  });
});

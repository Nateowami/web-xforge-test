import { IndexeddbOfflineStore } from 'xforge-common/indexeddb-offline-store';
import { UserDoc } from 'xforge-common/models/user-doc';
import { environment } from '../../../environments/environment';
import { environment as prodEnvironment } from '../../../environments/environment.prod';
import { environment as pwaTestEnvironment } from '../../../environments/environment.pwa-test';
import { environment as stagingEnvironment } from '../../../environments/environment.staging';
import { SF_TYPE_REGISTRY } from './sf-type-registry';

interface OfflineDBSchema {
  [store: string]: { [index: string]: string | string[] };
}

/**
 * The offline database schema (object stores and their indexes) created for the registered types, and the offline
 * database version it was recorded at. Existing offline databases are only upgraded to a new schema when the
 * offline database version changes, so if the schema changes, increment offlineDBVersion in every environment file
 * and record the new schema and version here.
 */
const OFFLINE_DB_VERSION = 9;
const OFFLINE_DB_SCHEMA: OfflineDBSchema = {
  audio: {},
  biblical_terms: {
    projectRef: 'data.projectRef',
    projectRef_references: ['data.projectRef', 'data.references']
  },
  edited_segments: {},
  note_threads: {
    projectRef: 'data.projectRef',
    projectRef_biblicalTermId: ['data.projectRef', 'data.biblicalTermId'],
    'projectRef_status_verseRef.bookNum_verseRef.chapterNum': [
      'data.projectRef',
      'data.status',
      'data.verseRef.bookNum',
      'data.verseRef.chapterNum'
    ]
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
  sf_project_user_configs: {
    projectRef: 'data.projectRef'
  },
  sf_projects: {
    name: 'data.name',
    paratextId: 'data.paratextId',
    shortName: 'data.shortName',
    'translateConfig.draftConfig.draftingSources.projectRef':
      'data.translateConfig.draftConfig.draftingSources.projectRef',
    'translateConfig.draftConfig.trainingSources.projectRef':
      'data.translateConfig.draftConfig.trainingSources.projectRef',
    'translateConfig.source.projectRef': 'data.translateConfig.source.projectRef'
  },
  sf_projects_profile: {},
  text_audio: {
    projectRef: 'data.projectRef'
  },
  texts: {},
  'training-data': {},
  training_data: {
    projectRef: 'data.projectRef'
  },
  user_profiles: {},
  users: {
    email: 'data.email',
    paratextId: 'data.paratextId'
  }
};

describe('SF_TYPE_REGISTRY', () => {
  let store: IndexeddbOfflineStore;

  beforeEach(async () => {
    store = new IndexeddbOfflineStore(SF_TYPE_REGISTRY);
    await store.deleteDB();
  });

  afterEach(async () => {
    await store.deleteDB();
  });

  it('creates the offline database schema recorded for the current offline database version', async () => {
    await store.getAllIds(UserDoc.COLLECTION);

    expect(await getSchema())
      .withContext(
        'The offline database schema has changed. Increment offlineDBVersion in every environment file so that ' +
          'existing offline databases are upgraded, then record the new schema and version in this spec.'
      )
      .toEqual(OFFLINE_DB_SCHEMA);
    expect(environment.offlineDBVersion)
      .withContext('Record the offline database schema for the new offline database version in this spec.')
      .toEqual(OFFLINE_DB_VERSION);
  });

  it('uses the same offline database version in every environment', () => {
    for (const env of [prodEnvironment, stagingEnvironment, pwaTestEnvironment]) {
      expect(env.offlineDBVersion).toEqual(environment.offlineDBVersion);
    }
  });
});

function getSchema(): Promise<OfflineDBSchema> {
  return new Promise<OfflineDBSchema>((resolve, reject) => {
    const request = window.indexedDB.open('xforge');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const schema: OfflineDBSchema = {};
      const storeNames = Array.from(db.objectStoreNames);
      const transaction = db.transaction(storeNames);
      for (const storeName of storeNames) {
        const objectStore = transaction.objectStore(storeName);
        schema[storeName] = {};
        for (const indexName of Array.from(objectStore.indexNames)) {
          schema[storeName][indexName] = objectStore.index(indexName).keyPath;
        }
      }
      db.close();
      resolve(schema);
    };
  });
}

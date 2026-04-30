'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const sharedb_1 = __importDefault(require('sharedb'));
const sharedb_mingo_memory_1 = __importDefault(require('sharedb-mingo-memory'));
const ts_mockito_1 = require('ts-mockito');
const user_1 = require('../../common/models/user');
const user_test_data_1 = require('../../common/models/user-test-data');
const realtime_server_1 = require('../../common/realtime-server');
const schema_version_repository_1 = require('../../common/schema-version-repository');
const test_utils_1 = require('../../common/utils/test-utils');
const note_thread_1 = require('../models/note-thread');
const sf_project_1 = require('../models/sf-project');
const sf_project_role_1 = require('../models/sf-project-role');
const sf_project_test_data_1 = require('../models/sf-project-test-data');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const sf_project_user_config_test_data_1 = require('../models/sf-project-user-config-test-data');
const note_thread_service_1 = require('./note-thread-service');
describe('NoteThreadService', () => {
  it('the model builds an id as expected', () => {
    expect((0, note_thread_1.getNoteThreadDocId)('myProjectId', 'myNoteThreadId')).toEqual(
      'myProjectId:myNoteThreadId'
    );
  });
  it('removes read refs when note deleted', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.projectAdminId);
      yield env.setHaveReadNoteRefs(conn);
      // Assert that data is set up as expected for testing.
      const noteThread01 =
        env.db.docs[note_thread_1.NOTE_THREAD_COLLECTION][
          (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1)
        ].data;
      env.assertHaveReadNotes();
      let adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.projectAdminId)
        ].data;
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note01');
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note02');
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note03');
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note04');
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread02note01');
      let checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.checkerId)
        ].data;
      expect(checkerProjectUserConfig.noteRefsRead).toContain('noteThread01note03');
      expect(checkerProjectUserConfig.noteRefsRead).toContain('noteThread01note04');
      const nt01n01index = noteThread01.notes.findIndex(note => note.dataId === 'noteThread01note01');
      const nt01n02index = noteThread01.notes.findIndex(note => note.dataId === 'noteThread01note02');
      const nt01n03index = noteThread01.notes.findIndex(note => note.dataId === 'noteThread01note03');
      // SUT
      yield (0, test_utils_1.submitJson0Op)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1),
        ops => {
          ops.remove(noteThread => noteThread.notes, nt01n03index);
          ops.remove(noteThread => noteThread.notes, nt01n02index);
          ops.remove(noteThread => noteThread.notes, nt01n01index);
        }
      );
      yield (0, test_utils_1.flushPromises)();
      adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.projectAdminId)
        ].data;
      // This have-read should be gone since the corresponding note was removed.
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note01');
      // User still does not have this have-read item, and importantly, nothing crashed as a result.
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note02');
      // This have-read should be gone since the corresponding note was removed.
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note03');
      // This have-read should not have been removed because the note was not removed.
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note04');
      // this have-read should not have been removed. It regards a note in another notethread that was not touched.
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread02note01');
      checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.checkerId)
        ].data;
      // This have-read should be gone since the corresponding note was removed.
      expect(checkerProjectUserConfig.noteRefsRead).not.toContain('noteThread01note03');
      // This have-read should not have been removed because the note was not removed.
      expect(checkerProjectUserConfig.noteRefsRead).toContain('noteThread01note04');
    }));
  it('allows user to read note thread', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.projectAdminId);
      const doc = yield (0, test_utils_1.fetchDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1)
      );
      expect(doc).not.toBeNull();
    }));
  it('allows translators to edit note thread position', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.translator);
      const noteThreadId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1);
      const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadId);
      expect(doc.data.position).toEqual({ start: 0, length: 0 });
      const position = { start: 0, length: 7 };
      yield (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadId, op =>
        op.set(n => n.position, position)
      );
      expect(doc.data.position).toEqual(position);
    }));
  it('prohibits commenter user to read note threads not published in Scripture Forge', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.commenterId);
      const noteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1);
      yield expect(() =>
        __awaiter(void 0, void 0, void 0, function* () {
          return (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId);
        })
      ).rejects.toEqual(
        new Error(
          `403: Permission denied (read), collection: ${note_thread_1.NOTE_THREAD_COLLECTION}, docId: ${noteThreadDocId}`
        )
      );
      const doc = yield (0, test_utils_1.fetchDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId3)
      );
      expect(doc).not.toBeNull();
    }));
  it('allows a commenter to create a note thread', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      // the user id 'commenter' is assigned to have the commenter role on the project
      const conn = (0, test_utils_1.clientConnect)(env.server, env.commenterId);
      const noteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', 'dataId04');
      const noteThread = {
        dataId: 'dataId04',
        threadId: 'noteThread04',
        ownerRef: env.commenterId,
        projectRef: 'project01',
        publishedToSF: true,
        originalContextAfter: '',
        originalSelectedText: '',
        originalContextBefore: '',
        verseRef: { bookNum: 40, chapterNum: 1, verseNum: 10 },
        status: note_thread_1.NoteStatus.Todo,
        position: { start: 0, length: 0 },
        notes: [env.getNewNote('noteThread04', 'noteThread04note01', env.commenterId)]
      };
      yield (0, test_utils_1.createDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId, noteThread);
      const noteThreadDoc = yield (0, test_utils_1.fetchDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        noteThreadDocId
      );
      expect(noteThreadDoc).not.toBeNull();
    }));
  it('commenters can add notes to note thread they can read', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.commenterId);
      const noteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1);
      const note = env.getNewNote('noteThread01', 'commenterNote01', env.commenterId);
      // since the user cannot read the note thread, they should not be able to add a note
      yield expect(() =>
        (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId, op =>
          op.insert(n => n.notes, 4, note)
        )
      ).rejects.toEqual(
        new Error(
          `403: Permission denied (read), collection: ${note_thread_1.NOTE_THREAD_COLLECTION}, docId: ${noteThreadDocId}`
        )
      );
      const sfNoteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId2);
      const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, sfNoteThreadDocId);
      let sfNoteThread = doc.data;
      expect(sfNoteThread.notes.length).toEqual(1);
      yield (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, sfNoteThreadDocId, op =>
        op.insert(n => n.notes, 1, note)
      );
      sfNoteThread = doc.data;
      expect(sfNoteThread.notes.length).toEqual(2);
    }));
  it('allows commenter to update and delete own note', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.commenterId);
      const noteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId2);
      const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId);
      const noteThread = doc.data;
      expect(noteThread).not.toBeNull();
      const content = 'edited content';
      // edit the note
      yield expect(() =>
        (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId, op =>
          op.set(n => n.notes[0].content, content)
        )
      ).rejects.toEqual(
        new Error(
          `403: Permission denied (update), collection: ${note_thread_1.NOTE_THREAD_COLLECTION}, docId: ${noteThreadDocId}`
        )
      );
      // delete the note
      yield expect(() =>
        (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId, op =>
          op.remove(n => n.notes, 0)
        )
      ).rejects.toEqual(
        new Error(
          `403: Permission denied (update), collection: ${note_thread_1.NOTE_THREAD_COLLECTION}, docId: ${noteThreadDocId}`
        )
      );
      const commenterNoteThreadId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId3);
      const commenterDoc = yield (0, test_utils_1.fetchDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        commenterNoteThreadId
      );
      let commenterNoteThread = commenterDoc.data;
      expect(commenterNoteThread).not.toBeNull();
      // edit the note
      yield (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, commenterNoteThreadId, op =>
        op.set(n => n.notes[0].content, content)
      );
      commenterNoteThread = commenterDoc.data;
      expect(commenterNoteThread.notes[0].content).toEqual('edited content');
      // delete the note
      yield (0, test_utils_1.submitJson0Op)(conn, note_thread_1.NOTE_THREAD_COLLECTION, commenterNoteThreadId, op =>
        op.remove(n => n.notes, 0)
      );
      commenterNoteThread = commenterDoc.data;
      expect(commenterNoteThread.notes.length).toEqual(0);
    }));
  it('allows commenter to delete their own note thread', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.commenterId);
      const noteThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId2);
      yield expect(() =>
        (0, test_utils_1.deleteDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, noteThreadDocId)
      ).rejects.toEqual(
        new Error(
          `403: Permission denied (delete), collection: ${note_thread_1.NOTE_THREAD_COLLECTION}, docId: ${noteThreadDocId}`
        )
      );
      const commenterThreadDocId = (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId3);
      const doc = yield (0, test_utils_1.fetchDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, commenterThreadDocId);
      let commenterNoteThread = doc.data;
      expect(commenterNoteThread).toBeDefined();
      // the user who created the first note in the thread can delete the thread because they own the thread
      yield (0, test_utils_1.deleteDoc)(conn, note_thread_1.NOTE_THREAD_COLLECTION, commenterThreadDocId);
      commenterNoteThread = doc.data;
      expect(commenterNoteThread).toBeUndefined();
    }));
  it('removes have-read note refs when thread deleted', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const env = new TestEnvironment();
      yield env.createData();
      const conn = (0, test_utils_1.clientConnect)(env.server, env.projectAdminId);
      yield env.setHaveReadNoteRefs(conn);
      // Assert that data is set up as expected for testing.
      expect(
        yield (0, test_utils_1.hasDoc)(
          conn,
          note_thread_1.NOTE_THREAD_COLLECTION,
          (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1)
        )
      ).toEqual(true);
      env.assertHaveReadNotes();
      let adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.projectAdminId)
        ].data;
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note01');
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread01note03');
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread02note01');
      let checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.checkerId)
        ].data;
      expect(checkerProjectUserConfig.noteRefsRead).toContain('noteThread01note03');
      // SUT
      yield (0, test_utils_1.deleteDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1)
      );
      yield (0, test_utils_1.flushPromises)();
      // Doc should be gone.
      expect(
        yield (0, test_utils_1.hasDoc)(
          conn,
          note_thread_1.NOTE_THREAD_COLLECTION,
          (0, note_thread_1.getNoteThreadDocId)('project01', env.dataId1)
        )
      ).toEqual(false);
      adminProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.projectAdminId)
        ].data;
      // Have-read note references to notes in the thread that was removed should be gone.
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note01');
      expect(adminProjectUserConfig.noteRefsRead).not.toContain('noteThread01note03');
      // Have-read note references to notes in a thread that was not removed should not have disappeared.
      expect(adminProjectUserConfig.noteRefsRead).toContain('noteThread02note01');
      checkerProjectUserConfig =
        env.db.docs[sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION][
          (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', env.checkerId)
        ].data;
      // Also for other users, the have-read note references to notes in the removed thread, should be gone.
      expect(checkerProjectUserConfig.noteRefsRead).not.toContain('noteThread01note03');
    }));
});
class TestEnvironment {
  constructor() {
    this.projectAdminId = 'projectAdmin';
    this.translator = 'translator';
    this.checkerId = 'checker';
    this.commenterId = 'commenter';
    this.mockedSchemaVersionRepository = (0, ts_mockito_1.mock)(schema_version_repository_1.SchemaVersionRepository);
    this.dataId1 = 'dataId01';
    this.dataId2 = 'dataId02';
    this.dataId3 = 'dataId03';
    this.threadId1 = 'noteThread01';
    this.threadId2 = 'noteThread02';
    this.threadId3 = 'noteThread03';
    this.service = new note_thread_service_1.NoteThreadService();
    const ShareDBMingoType = sharedb_mingo_memory_1.default.extendMemoryDB(sharedb_1.default.MemoryDB);
    this.db = new ShareDBMingoType();
    this.server = new realtime_server_1.RealtimeServer(
      'TEST',
      false,
      false,
      [this.service],
      sf_project_1.SF_PROJECTS_COLLECTION,
      this.db,
      (0, ts_mockito_1.instance)(this.mockedSchemaVersionRepository)
    );
    (0, test_utils_1.allowAll)(this.server, user_1.USERS_COLLECTION);
    (0, test_utils_1.allowAll)(this.server, sf_project_1.SF_PROJECTS_COLLECTION);
    (0, test_utils_1.allowAll)(this.server, sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION);
  }
  createData() {
    return __awaiter(this, void 0, void 0, function* () {
      const conn = this.server.connect();
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        this.projectAdminId,
        (0, user_test_data_1.createTestUser)({}, 1)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.projectAdminId),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: this.projectAdminId,
          questionRefsRead: ['question01'],
          answerRefsRead: ['answer01'],
          commentRefsRead: ['comment01'],
          noteRefsRead: []
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        this.checkerId,
        (0, user_test_data_1.createTestUser)({}, 2)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.checkerId),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: this.checkerId,
          questionRefsRead: ['question01'],
          answerRefsRead: ['answer01'],
          commentRefsRead: ['comment01']
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        user_1.USERS_COLLECTION,
        this.commenterId,
        (0, user_test_data_1.createTestUser)({}, 3)
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.commenterId),
        (0, sf_project_user_config_test_data_1.createTestProjectUserConfig)({
          projectRef: 'project01',
          ownerRef: this.commenterId,
          translationSuggestionsEnabled: false
        })
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        sf_project_1.SF_PROJECTS_COLLECTION,
        'project01',
        (0, sf_project_test_data_1.createTestProject)({
          userRoles: {
            projectAdmin: sf_project_role_1.SFProjectRole.ParatextAdministrator,
            translator: sf_project_role_1.SFProjectRole.ParatextTranslator,
            checker: sf_project_role_1.SFProjectRole.CommunityChecker,
            commenter: sf_project_role_1.SFProjectRole.Commenter
          }
        })
      );
      const verseRef = {
        bookNum: 40,
        chapterNum: 1,
        verseNum: 1
      };
      const position = { start: 0, length: 0 };
      const status = note_thread_1.NoteStatus.Todo;
      yield (0, test_utils_1.createDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', this.dataId1),
        {
          projectRef: 'project01',
          ownerRef: 'some-owner',
          dataId: this.dataId1,
          threadId: this.threadId1,
          verseRef,
          notes: [
            this.getNewNote(this.threadId1, 'noteThread01note01', 'ptUser01'),
            this.getNewNote(this.threadId1, 'noteThread01note02', 'ptUser01'),
            this.getNewNote(this.threadId1, 'noteThread01note03', 'ptUser01'),
            this.getNewNote(this.threadId1, 'noteThread01note04', 'ptUser01')
          ],
          originalSelectedText: '',
          originalContextBefore: '',
          originalContextAfter: '',
          position,
          status,
          publishedToSF: false
        }
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', this.dataId2),
        {
          projectRef: 'project01',
          ownerRef: 'some-owner',
          dataId: this.dataId2,
          threadId: this.threadId2,
          verseRef,
          notes: [this.getNewNote(this.dataId2, 'noteThread02note01', 'ptUser01')],
          originalSelectedText: '',
          originalContextBefore: '',
          originalContextAfter: '',
          position,
          status,
          publishedToSF: true
        }
      );
      yield (0, test_utils_1.createDoc)(
        conn,
        note_thread_1.NOTE_THREAD_COLLECTION,
        (0, note_thread_1.getNoteThreadDocId)('project01', this.dataId3),
        {
          projectRef: 'project01',
          ownerRef: this.commenterId,
          dataId: this.dataId3,
          threadId: this.threadId3,
          verseRef,
          notes: [this.getNewNote(this.threadId3, 'noteThread03note01', this.commenterId)],
          originalSelectedText: '',
          originalContextBefore: '',
          originalContextAfter: '',
          position,
          status,
          publishedToSF: true
        }
      );
    });
  }
  /** Set have-read indications for specific notes. */
  setHaveReadNoteRefs(conn) {
    return __awaiter(this, void 0, void 0, function* () {
      yield (0, test_utils_1.submitJson0Op)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.projectAdminId),
        ops => {
          ops.add(puc => puc.noteRefsRead, 'noteThread01note01');
          ops.add(puc => puc.noteRefsRead, 'noteThread01note03');
          ops.add(puc => puc.noteRefsRead, 'noteThread01note04');
          ops.add(puc => puc.noteRefsRead, 'noteThread02note01');
        }
      );
      yield (0, test_utils_1.submitJson0Op)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        (0, sf_project_user_config_1.getSFProjectUserConfigDocId)('project01', this.checkerId),
        ops => {
          ops.add(puc => puc.noteRefsRead, 'noteThread01note03');
          ops.add(puc => puc.noteRefsRead, 'noteThread01note04');
        }
      );
      yield (0, test_utils_1.flushPromises)();
    });
  }
  assertHaveReadNotes() {
    const noteThread01 =
      this.db.docs[note_thread_1.NOTE_THREAD_COLLECTION][
        (0, note_thread_1.getNoteThreadDocId)('project01', this.dataId1)
      ].data;
    const noteThread01noteIds = noteThread01.notes.map(note => note.dataId);
    expect(noteThread01noteIds).toContain('noteThread01note01');
    expect(noteThread01noteIds).toContain('noteThread01note02');
    expect(noteThread01noteIds).toContain('noteThread01note03');
    expect(noteThread01noteIds).toContain('noteThread01note04');
    const noteThread02 =
      this.db.docs[note_thread_1.NOTE_THREAD_COLLECTION][
        (0, note_thread_1.getNoteThreadDocId)('project01', this.dataId2)
      ].data;
    const noteThread02noteIds = noteThread02.notes.map(note => note.dataId);
    expect(noteThread02noteIds).toContain('noteThread02note01');
  }
  getNewNote(threadId, dataId, ownerRef) {
    return {
      dataId,
      threadId,
      dateCreated: '',
      dateModified: '',
      ownerRef,
      content: 'note content',
      type: note_thread_1.NoteType.Normal,
      conflictType: note_thread_1.NoteConflictType.DefaultValue,
      status: note_thread_1.NoteStatus.Todo,
      deleted: false
    };
  }
}
//# sourceMappingURL=note-thread-service.spec.js.map

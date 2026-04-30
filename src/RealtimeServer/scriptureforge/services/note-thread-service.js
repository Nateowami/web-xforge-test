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
Object.defineProperty(exports, '__esModule', { value: true });
exports.NoteThreadService = void 0;
const obj_path_1 = require('../../common/utils/obj-path');
const sharedb_utils_1 = require('../../common/utils/sharedb-utils');
const note_thread_1 = require('../models/note-thread');
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const note_thread_migrations_1 = require('./note-thread-migrations');
const sf_project_data_service_1 = require('./sf-project-data-service');
class NoteThreadService extends sf_project_data_service_1.SFProjectDataService {
  constructor() {
    super(note_thread_migrations_1.NOTE_THREAD_MIGRATIONS);
    this.collection = note_thread_1.NOTE_THREAD_COLLECTION;
    this.indexPaths = note_thread_1.NOTE_THREAD_INDEX_PATHS;
    this.listenForUpdates = true;
    this.validationSchema = {
      bsonType: sf_project_data_service_1.SFProjectDataService.validationSchema.bsonType,
      required: sf_project_data_service_1.SFProjectDataService.validationSchema.required,
      properties: Object.assign(
        Object.assign({}, sf_project_data_service_1.SFProjectDataService.validationSchema.properties),
        {
          _id: {
            bsonType: 'string',
            pattern: '^[0-9a-f]+:[0-9a-f]+$'
          },
          dataId: {
            bsonType: 'string'
          },
          threadId: {
            bsonType: 'string'
          },
          verseRef: {
            bsonType: 'object',
            required: ['bookNum', 'chapterNum', 'verseNum'],
            properties: {
              bookNum: {
                bsonType: 'int'
              },
              chapterNum: {
                bsonType: 'int'
              },
              verseNum: {
                bsonType: 'int'
              },
              verse: {
                bsonType: 'string'
              }
            },
            additionalProperties: false
          },
          notes: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['threadId', 'type', 'status', 'dataId', 'deleted', 'dateModified', 'dateCreated'],
              properties: {
                threadId: {
                  bsonType: 'string'
                },
                type: {
                  bsonType: 'string'
                },
                conflictType: {
                  bsonType: 'string'
                },
                status: {
                  enum: ['', 'todo', 'done', 'deleted']
                },
                tagId: {
                  bsonType: 'int'
                },
                reattached: {
                  bsonType: 'string'
                },
                assignment: {
                  bsonType: 'string'
                },
                content: {
                  bsonType: 'string'
                },
                acceptedChangeXml: {
                  bsonType: 'string'
                },
                dataId: {
                  bsonType: 'string',
                  pattern: '^.+$'
                },
                deleted: {
                  bsonType: 'bool'
                },
                syncUserRef: {
                  bsonType: 'string'
                },
                dateModified: {
                  bsonType: 'string'
                },
                dateCreated: {
                  bsonType: 'string'
                },
                editable: {
                  bsonType: 'bool'
                },
                versionNumber: {
                  bsonType: 'int'
                },
                ownerRef: {
                  bsonType: 'string',
                  pattern: '^.*$'
                }
              },
              additionalProperties: false
            }
          },
          originalSelectedText: {
            bsonType: 'string'
          },
          originalContextBefore: {
            bsonType: 'string'
          },
          originalContextAfter: {
            bsonType: 'string'
          },
          position: {
            bsonType: 'object',
            required: ['start', 'length'],
            properties: {
              start: {
                bsonType: 'int'
              },
              length: {
                bsonType: 'int'
              }
            },
            additionalProperties: false
          },
          status: {
            enum: ['', 'todo', 'done', 'deleted']
          },
          publishedToSF: {
            bsonType: 'bool'
          },
          assignment: {
            bsonType: 'string'
          },
          biblicalTermId: {
            bsonType: 'string'
          },
          extraHeadingInfo: {
            bsonType: 'object',
            properties: {
              gloss: {
                bsonType: 'string'
              },
              language: {
                bsonType: 'string'
              },
              lemma: {
                bsonType: 'string'
              },
              transliteration: {
                bsonType: 'string'
              }
            },
            additionalProperties: false
          }
        }
      ),
      additionalProperties: false
    };
    const immutableProps = [
      this.pathTemplate(t => t.dataId),
      this.pathTemplate(t => t.verseRef),
      this.pathTemplate(t => t.originalSelectedText),
      this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX].dataId),
      this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX].ownerRef),
      this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX].editable),
      this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX].versionNumber),
      this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX].dateCreated),
      this.pathTemplate(t => t.biblicalTermId),
      this.pathTemplate(t => t.extraHeadingInfo)
    ];
    this.immutableProps.push(...immutableProps);
  }
  setupDomains() {
    return [
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.PTNoteThreads,
        pathTemplate: this.pathTemplate()
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.SFNoteThreads,
        pathTemplate: this.pathTemplate()
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.Notes,
        pathTemplate: this.pathTemplate(t => t.notes[obj_path_1.ANY_INDEX])
      }
    ];
  }
  getApplicableDomains(entity) {
    const domains = super.getApplicableDomains(entity);
    const noteThread = entity;
    if (noteThread == null) return domains;
    const applicableDomains = [];
    for (const domain of domains) {
      if (
        noteThread.publishedToSF === true &&
        domain.projectDomain === sf_project_rights_1.SFProjectDomain.PTNoteThreads
      ) {
        continue;
      }
      if (
        noteThread.publishedToSF !== true &&
        domain.projectDomain === sf_project_rights_1.SFProjectDomain.SFNoteThreads
      ) {
        continue;
      }
      applicableDomains.push(domain);
    }
    return applicableDomains;
  }
  onDelete(userId, docId, projectDomain, entity) {
    return __awaiter(this, void 0, void 0, function* () {
      if (projectDomain === sf_project_rights_1.SFProjectDomain.Notes) {
        yield this.removeEntityHaveReadRefs(userId, docId, projectDomain, entity);
      }
    });
  }
  onBeforeDelete(userId, docId, projectDomain, entity) {
    return __awaiter(this, void 0, void 0, function* () {
      // Process an incoming deletion for a NoteThread before it happens so we can look at its list of notes.
      if (projectDomain === sf_project_rights_1.SFProjectDomain.PTNoteThreads) {
        yield this.removeEntityHaveReadRefs(userId, docId, projectDomain, entity);
      }
    });
  }
  removeEntityHaveReadRefs(userId, docId, projectDomain, entity) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.server == null) {
        throw Error('Null server');
      }
      const parts = docId.split(':');
      const projectId = parts[0];
      const conn = this.server.connect(userId);
      const pucDocs = (yield (0, sharedb_utils_1.createFetchQuery)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        { projectRef: projectId }
      )).results;
      const promises = [];
      for (const doc of pucDocs) {
        switch (projectDomain) {
          case sf_project_rights_1.SFProjectDomain.PTNoteThreads:
          case sf_project_rights_1.SFProjectDomain.SFNoteThreads:
            entity.notes.forEach(note => promises.push(this.removeNoteHaveReadRefs(doc, note)));
            break;
          case sf_project_rights_1.SFProjectDomain.Notes:
            promises.push(this.removeNoteHaveReadRefs(doc, entity));
            break;
        }
      }
      yield Promise.all(promises);
    });
  }
  removeNoteHaveReadRefs(sfProjectUserConfigDoc, note) {
    return (0, sharedb_utils_1.docSubmitJson0Op)(sfProjectUserConfigDoc, ops => {
      const data = sfProjectUserConfigDoc.data;
      const index = data.noteRefsRead.indexOf(note.dataId);
      if (index !== -1) {
        ops.remove(puc => puc.noteRefsRead, index);
      }
    });
  }
}
exports.NoteThreadService = NoteThreadService;
//# sourceMappingURL=note-thread-service.js.map

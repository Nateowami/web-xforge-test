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
exports.QuestionService = void 0;
const obj_path_1 = require('../../common/utils/obj-path');
const sharedb_utils_1 = require('../../common/utils/sharedb-utils');
const question_1 = require('../models/question');
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const question_migrations_1 = require('./question-migrations');
const sf_project_data_service_1 = require('./sf-project-data-service');
/**
 * This class manages question list docs.
 */
class QuestionService extends sf_project_data_service_1.SFProjectDataService {
  constructor() {
    super(question_migrations_1.QUESTION_MIGRATIONS);
    this.collection = question_1.QUESTIONS_COLLECTION;
    this.indexPaths = question_1.QUESTION_INDEX_PATHS;
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
            bsonType: 'string',
            pattern: '^[0-9a-f]+$'
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
          text: {
            bsonType: 'string'
          },
          audioUrl: {
            bsonType: 'string'
          },
          answers: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['dataId', 'deleted', 'dateModified', 'dateCreated'],
              properties: {
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
                comments: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['dataId', 'deleted', 'dateModified', 'dateCreated'],
                    properties: {
                      dataId: {
                        bsonType: 'string',
                        pattern: '^[0-9a-f]+$'
                      },
                      deleted: {
                        bsonType: 'bool'
                      },
                      syncUserRef: {
                        bsonType: 'string'
                      },
                      text: {
                        bsonType: 'string'
                      },
                      audioUrl: {
                        bsonType: 'string'
                      },
                      dateModified: {
                        bsonType: 'string'
                      },
                      dateCreated: {
                        bsonType: 'string'
                      },
                      ownerRef: {
                        bsonType: 'string',
                        pattern: '^[0-9a-f]*$'
                      }
                    },
                    additionalProperties: false
                  }
                },
                likes: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['ownerRef'],
                    properties: {
                      ownerRef: {
                        bsonType: 'string',
                        pattern: '^[0-9a-f]+$'
                      }
                    },
                    additionalProperties: false
                  }
                },
                status: {
                  enum: ['', 'resolved', 'export']
                },
                scriptureText: {
                  bsonType: 'string'
                },
                selectionStartClipped: {
                  bsonType: 'bool'
                },
                selectionEndClipped: {
                  bsonType: 'bool'
                },
                audioUrl: {
                  bsonType: 'string'
                },
                dataId: {
                  bsonType: 'string',
                  pattern: '^[0-9a-f]+$'
                },
                deleted: {
                  bsonType: 'bool'
                },
                syncUserRef: {
                  bsonType: 'string'
                },
                text: {
                  bsonType: ['null', 'string']
                },
                dateModified: {
                  bsonType: 'string'
                },
                dateCreated: {
                  bsonType: 'string'
                },
                ownerRef: {
                  bsonType: 'string',
                  pattern: '^[0-9a-f]*$'
                }
              },
              additionalProperties: false
            }
          },
          isArchived: {
            bsonType: 'bool'
          },
          dateArchived: {
            bsonType: 'string'
          },
          dateModified: {
            bsonType: 'string'
          },
          dateCreated: {
            bsonType: 'string'
          },
          transceleratorQuestionId: {
            bsonType: 'string'
          },
          paratextNoteId: {
            bsonType: 'string'
          }
        }
      ),
      additionalProperties: false
    };
    const immutableProps = [
      this.pathTemplate(q => q.dataId),
      this.pathTemplate(q => q.dateCreated),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].dataId),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].ownerRef),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].syncUserRef),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].dateCreated),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].comments[obj_path_1.ANY_INDEX].dataId),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].comments[obj_path_1.ANY_INDEX].ownerRef),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].comments[obj_path_1.ANY_INDEX].syncUserRef),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].comments[obj_path_1.ANY_INDEX].dateCreated),
      this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].likes[obj_path_1.ANY_INDEX].ownerRef)
    ];
    this.immutableProps.push(...immutableProps);
  }
  setupDomains() {
    return [
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.Questions,
        pathTemplate: this.pathTemplate()
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.Answers,
        pathTemplate: this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX])
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.AnswerComments,
        pathTemplate: this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].comments[obj_path_1.ANY_INDEX])
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.AnswerStatus,
        pathTemplate: this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].status)
      },
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.Likes,
        pathTemplate: this.pathTemplate(q => q.answers[obj_path_1.ANY_INDEX].likes[obj_path_1.ANY_INDEX])
      }
    ];
  }
  onDelete(userId, docId, projectDomain, entity) {
    return __awaiter(this, void 0, void 0, function* () {
      if (
        projectDomain === sf_project_rights_1.SFProjectDomain.Answers ||
        projectDomain === sf_project_rights_1.SFProjectDomain.AnswerComments
      ) {
        yield this.removeEntityReadRefs(userId, docId, projectDomain, entity);
      }
    });
  }
  removeEntityReadRefs(userId, docId, projectDomain, entity) {
    return __awaiter(this, void 0, void 0, function* () {
      const parts = docId.split(':');
      const projectId = parts[0];
      const conn = this.server.connect(userId);
      const query = yield (0, sharedb_utils_1.createFetchQuery)(
        conn,
        sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION,
        { projectRef: projectId }
      );
      const promises = [];
      for (const doc of query.results) {
        switch (projectDomain) {
          case sf_project_rights_1.SFProjectDomain.Answers:
            promises.push(this.removeAnswerReadRefs(doc, entity));
            break;
          case sf_project_rights_1.SFProjectDomain.AnswerComments:
            promises.push(this.removeCommentReadRefs(doc, entity));
            break;
        }
      }
      yield Promise.all(promises);
    });
  }
  removeAnswerReadRefs(doc, answer) {
    return (0, sharedb_utils_1.docSubmitJson0Op)(doc, ops => {
      const data = doc.data;
      const index = data.answerRefsRead.indexOf(answer.dataId);
      if (index !== -1) {
        ops.remove(puc => puc.answerRefsRead, index);
      }
      const commentIds = new Set(answer.comments.map(c => c.dataId));
      for (let i = data.commentRefsRead.length - 1; i >= 0; i--) {
        if (commentIds.has(data.commentRefsRead[i])) {
          ops.remove(puc => puc.commentRefsRead, i);
        }
      }
    });
  }
  removeCommentReadRefs(doc, comment) {
    return (0, sharedb_utils_1.docSubmitJson0Op)(doc, ops => {
      const data = doc.data;
      const index = data.commentRefsRead.indexOf(comment.dataId);
      if (index !== -1) {
        ops.remove(puc => puc.commentRefsRead, index);
      }
    });
  }
}
exports.QuestionService = QuestionService;
//# sourceMappingURL=question-service.js.map

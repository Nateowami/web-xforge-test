'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SFProjectService = void 0;
const project_rights_1 = require('../../common/models/project-rights');
const system_role_1 = require('../../common/models/system-role');
const project_service_1 = require('../../common/services/project-service');
const sf_project_1 = require('../models/sf-project');
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_role_1 = require('../models/sf-project-role');
const SF_PROJECT_PROFILE_FIELDS = {
  name: true,
  paratextId: true,
  rolePermissions: true,
  userRoles: true,
  userPermissions: true,
  shortName: true,
  writingSystem: true,
  isRightToLeft: true,
  biblicalTermsConfig: true,
  editable: true,
  defaultFontSize: true,
  defaultFont: true,
  translateConfig: true,
  checkingConfig: true,
  lynxConfig: true,
  texts: true,
  syncDisabled: true,
  sync: true,
  noteTags: true,
  copyrightBanner: true,
  copyrightNotice: true,
  visibility: true
};
/**
 * This class manages SF project docs.
 */
class SFProjectService extends project_service_1.ProjectService {
  constructor(sfProjectMigrations) {
    super(sfProjectMigrations);
    this.collection = sf_project_1.SF_PROJECTS_COLLECTION;
    this.indexPaths = sf_project_1.SF_PROJECT_INDEX_PATHS;
    this.projectAdminRole = sf_project_role_1.SFProjectRole.ParatextAdministrator;
    this.validationSchema = {
      bsonType: project_service_1.ProjectService.validationSchema.bsonType,
      required: project_service_1.ProjectService.validationSchema.required,
      properties: Object.assign(Object.assign({}, project_service_1.ProjectService.validationSchema.properties), {
        paratextId: {
          bsonType: 'string'
        },
        shortName: {
          bsonType: 'string'
        },
        writingSystem: {
          bsonType: 'object',
          properties: {
            region: {
              bsonType: 'string'
            },
            script: {
              bsonType: 'string'
            },
            tag: {
              bsonType: 'string'
            }
          },
          additionalProperties: false
        },
        isRightToLeft: {
          bsonType: 'bool'
        },
        translateConfig: {
          bsonType: 'object',
          properties: {
            translationSuggestionsEnabled: {
              bsonType: 'bool'
            },
            source: {
              bsonType: 'object',
              properties: {
                paratextId: {
                  bsonType: 'string'
                },
                projectRef: {
                  bsonType: 'string',
                  pattern: '^[0-9a-f]+$'
                },
                name: {
                  bsonType: 'string'
                },
                shortName: {
                  bsonType: 'string'
                },
                writingSystem: {
                  bsonType: 'object',
                  properties: {
                    region: {
                      bsonType: 'string'
                    },
                    script: {
                      bsonType: 'string'
                    },
                    tag: {
                      bsonType: 'string'
                    }
                  },
                  additionalProperties: false
                },
                isRightToLeft: {
                  bsonType: 'bool'
                }
              },
              additionalProperties: false
            },
            defaultNoteTagId: {
              bsonType: 'int'
            },
            preTranslate: {
              bsonType: 'bool'
            },
            draftConfig: {
              bsonType: 'object',
              properties: {
                draftingSources: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    properties: {
                      paratextId: {
                        bsonType: 'string'
                      },
                      projectRef: {
                        bsonType: 'string',
                        pattern: '^[0-9a-f]+$'
                      },
                      name: {
                        bsonType: 'string'
                      },
                      shortName: {
                        bsonType: 'string'
                      },
                      writingSystem: {
                        bsonType: 'object',
                        properties: {
                          region: {
                            bsonType: 'string'
                          },
                          script: {
                            bsonType: 'string'
                          },
                          tag: {
                            bsonType: 'string'
                          }
                        },
                        additionalProperties: false
                      },
                      isRightToLeft: {
                        bsonType: 'bool'
                      }
                    },
                    additionalProperties: false
                  }
                },
                trainingSources: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    properties: {
                      paratextId: {
                        bsonType: 'string'
                      },
                      projectRef: {
                        bsonType: 'string',
                        pattern: '^[0-9a-f]+$'
                      },
                      name: {
                        bsonType: 'string'
                      },
                      shortName: {
                        bsonType: 'string'
                      },
                      writingSystem: {
                        bsonType: 'object',
                        properties: {
                          region: {
                            bsonType: 'string'
                          },
                          script: {
                            bsonType: 'string'
                          },
                          tag: {
                            bsonType: 'string'
                          }
                        },
                        additionalProperties: false
                      },
                      isRightToLeft: {
                        bsonType: 'bool'
                      }
                    },
                    additionalProperties: false
                  }
                },
                lastSelectedTrainingDataFiles: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'string'
                  }
                },
                lastSelectedTrainingScriptureRanges: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    properties: {
                      projectId: {
                        bsonType: 'string'
                      },
                      scriptureRange: {
                        bsonType: 'string'
                      }
                    },
                    additionalProperties: false
                  }
                },
                lastSelectedTranslationScriptureRanges: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    properties: {
                      projectId: {
                        bsonType: 'string'
                      },
                      scriptureRange: {
                        bsonType: 'string'
                      }
                    },
                    additionalProperties: false
                  }
                },
                fastTraining: {
                  bsonType: 'bool'
                },
                useEcho: {
                  bsonType: 'bool'
                },
                servalConfig: {
                  bsonType: 'string'
                },
                usfmConfig: {
                  bsonType: 'object',
                  properties: {
                    paragraphFormat: {
                      enum: ['best_guess', 'remove', 'move_to_end']
                    },
                    quoteFormat: {
                      enum: ['denormalized', 'normalized']
                    }
                  },
                  additionalProperties: false
                },
                sendEmailOnBuildFinished: {
                  bsonType: 'bool'
                },
                currentScriptureRange: {
                  bsonType: 'string'
                },
                draftedScriptureRange: {
                  bsonType: 'string'
                },
                qualityEstimationConfig: {
                  bsonType: 'object',
                  properties: {
                    version: {
                      bsonType: 'string'
                    },
                    slope: {
                      bsonType: 'number'
                    },
                    intercept: {
                      bsonType: 'number'
                    }
                  },
                  additionalProperties: false
                }
              },
              additionalProperties: false
            },
            projectType: {
              enum: [
                'Standard',
                'Resource',
                'BackTranslation',
                'Daughter',
                'Transliteration',
                'TransliterationManual',
                'TransliterationWithEncoder',
                'StudyBible',
                'ConsultantNotes',
                'GlobalConsultantNotes',
                'GlobalAnthropologyNotes',
                'StudyBibleAdditions',
                'Auxiliary',
                'AuxiliaryResource',
                'MarbleResource',
                'Xml',
                'XmlResource',
                'XmlDictionary',
                'SourceLanguage',
                'Dictionary',
                'EnhancedResource'
              ]
            },
            baseProject: {
              bsonType: 'object',
              properties: {
                paratextId: {
                  bsonType: 'string'
                },
                shortName: {
                  bsonType: 'string'
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        checkingConfig: {
          bsonType: 'object',
          properties: {
            checkingEnabled: {
              bsonType: 'bool'
            },
            usersSeeEachOthersResponses: {
              bsonType: 'bool'
            },
            answerExportMethod: {
              enum: ['', 'all', 'marked_for_export', 'none']
            },
            noteTagId: {
              bsonType: 'int'
            },
            hideCommunityCheckingText: {
              bsonType: 'bool'
            }
          },
          additionalProperties: false
        },
        lynxConfig: {
          bsonType: 'object',
          properties: {
            autoCorrectionsEnabled: {
              bsonType: 'bool'
            },
            assessmentsEnabled: {
              bsonType: 'bool'
            },
            punctuationCheckerEnabled: {
              bsonType: 'bool'
            },
            allowedCharacterCheckerEnabled: {
              bsonType: 'bool'
            }
          },
          additionalProperties: false
        },
        resourceConfig: {
          bsonType: 'object',
          properties: {
            createdTimestamp: {
              bsonType: 'string'
            },
            manifestChecksum: {
              bsonType: 'string'
            },
            permissionsChecksum: {
              bsonType: 'string'
            },
            revision: {
              bsonType: 'int'
            }
          },
          additionalProperties: false
        },
        texts: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['bookNum', 'hasSource'],
            properties: {
              bookNum: {
                bsonType: 'int'
              },
              hasSource: {
                bsonType: 'bool'
              },
              chapters: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['number', 'lastVerse', 'isValid'],
                  properties: {
                    number: {
                      bsonType: 'int'
                    },
                    lastVerse: {
                      bsonType: 'int'
                    },
                    hasAudio: {
                      bsonType: 'bool'
                    },
                    hasDraft: {
                      bsonType: 'bool'
                    },
                    draftApplied: {
                      bsonType: 'bool'
                    },
                    isValid: {
                      bsonType: 'bool'
                    },
                    permissions: {
                      bsonType: 'object',
                      patternProperties: {
                        '^[0-9a-f]+$': {
                          bsonType: 'string'
                        }
                      },
                      additionalProperties: false
                    }
                  },
                  additionalProperties: false
                }
              },
              permissions: {
                bsonType: 'object',
                patternProperties: {
                  '^[0-9a-f]+$': {
                    bsonType: 'string'
                  }
                },
                additionalProperties: false
              }
            },
            additionalProperties: false
          }
        },
        noteTags: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['tagId', 'name', 'icon', 'creatorResolve'],
            properties: {
              tagId: {
                bsonType: 'int'
              },
              name: {
                bsonType: 'string'
              },
              icon: {
                bsonType: 'string'
              },
              creatorResolve: {
                bsonType: 'bool'
              }
            },
            additionalProperties: false
          }
        },
        sync: {
          bsonType: 'object',
          properties: {
            queuedCount: {
              bsonType: 'int'
            },
            lastSyncSuccessful: {
              bsonType: 'bool'
            },
            dateLastSuccessfulSync: {
              bsonType: 'string'
            },
            syncedToRepositoryVersion: {
              bsonType: 'string'
            },
            dataInSync: {
              bsonType: 'bool'
            },
            lastSyncErrorCode: {
              bsonType: 'int'
            }
          },
          additionalProperties: false
        },
        editable: {
          bsonType: 'bool'
        },
        defaultFontSize: {
          bsonType: 'int'
        },
        defaultFont: {
          bsonType: 'string'
        },
        maxGeneratedUsersPerShareKey: {
          bsonType: 'int'
        },
        biblicalTermsConfig: {
          bsonType: 'object',
          properties: {
            biblicalTermsEnabled: {
              bsonType: 'bool'
            },
            errorMessage: {
              bsonType: 'string'
            },
            hasRenderings: {
              bsonType: 'bool'
            }
          },
          additionalProperties: false
        },
        copyrightBanner: {
          bsonType: 'string'
        },
        copyrightNotice: {
          bsonType: 'string'
        },
        visibility: {
          bsonType: 'string'
        },
        paratextUsers: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['username', 'opaqueUserId'],
            properties: {
              username: {
                bsonType: 'string'
              },
              opaqueUserId: {
                bsonType: 'string'
              },
              sfUserId: {
                bsonType: 'string'
              },
              role: {
                bsonType: 'string'
              }
            },
            additionalProperties: false
          }
        }
      }),
      additionalProperties: false
    };
    const immutableProps = [
      this.pathTemplate(p => p.sync),
      this.pathTemplate(p => p.paratextId),
      this.pathTemplate(p => p.paratextUsers),
      this.pathTemplate(p => p.texts),
      this.pathTemplate(p => p.translateConfig),
      this.pathTemplate(p => p.checkingConfig),
      this.pathTemplate(p => p.lynxConfig),
      this.pathTemplate(p => p.shortName),
      this.pathTemplate(p => p.writingSystem),
      this.pathTemplate(p => p.copyrightBanner),
      this.pathTemplate(p => p.copyrightNotice),
      this.pathTemplate(p => p.visibility)
    ];
    this.immutableProps.push(...immutableProps);
  }
  init(server) {
    server.addProjection(sf_project_1.SF_PROJECT_PROFILES_COLLECTION, this.collection, SF_PROJECT_PROFILE_FIELDS);
    super.init(server);
  }
  allowRead(docId, doc, session) {
    if (
      session.isServer ||
      session.roles.includes(system_role_1.SystemRole.SystemAdmin) ||
      Object.keys(doc).length === 0
    ) {
      return true;
    }
    if (this.hasRight(session.userId, doc, project_rights_1.Operation.View)) {
      return true;
    }
    for (const key of Object.keys(doc)) {
      if (!Object.prototype.hasOwnProperty.call(SF_PROJECT_PROFILE_FIELDS, key)) {
        return false;
      }
    }
    return super.allowRead(docId, doc, session);
  }
  setupDomains() {
    return [{ projectDomain: sf_project_rights_1.SFProjectDomain.Project, pathTemplate: this.pathTemplate() }];
  }
  hasRight(userId, doc, operation) {
    return sf_project_rights_1.SF_PROJECT_RIGHTS.hasRight(
      doc,
      userId,
      sf_project_rights_1.SFProjectDomain.Project,
      operation
    );
  }
}
exports.SFProjectService = SFProjectService;
//# sourceMappingURL=sf-project-service.js.map

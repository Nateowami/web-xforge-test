'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SFProjectUserConfigService = void 0;
const sf_project_rights_1 = require('../models/sf-project-rights');
const sf_project_user_config_1 = require('../models/sf-project-user-config');
const sf_project_data_service_1 = require('./sf-project-data-service');
/**
 * This class manages project-user configuration docs.
 */
class SFProjectUserConfigService extends sf_project_data_service_1.SFProjectDataService {
  constructor(sfProjectUserConfigMigrations) {
    super(sfProjectUserConfigMigrations);
    this.collection = sf_project_user_config_1.SF_PROJECT_USER_CONFIGS_COLLECTION;
    this.indexPaths = sf_project_user_config_1.SF_PROJECT_USER_CONFIG_INDEX_PATHS;
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
          selectedTask: {
            bsonType: 'string'
          },
          selectedQuestionRef: {
            bsonType: 'string'
          },
          selectedBookNum: {
            bsonType: 'int'
          },
          selectedChapterNum: {
            bsonType: 'int'
          },
          selectedBiblicalTermsCategory: {
            bsonType: 'string'
          },
          selectedBiblicalTermsFilter: {
            bsonType: 'string'
          },
          isTargetTextRight: {
            bsonType: 'bool'
          },
          confidenceThreshold: {
            bsonType: 'number'
          },
          biblicalTermsEnabled: {
            bsonType: 'bool'
          },
          transliterateBiblicalTerms: {
            bsonType: 'bool'
          },
          translationSuggestionsEnabled: {
            bsonType: 'bool'
          },
          numSuggestions: {
            bsonType: 'int'
          },
          selectedSegment: {
            bsonType: 'string'
          },
          selectedSegmentChecksum: {
            bsonType: 'int'
          },
          noteRefsRead: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          questionRefsRead: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          answerRefsRead: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          commentRefsRead: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          editorTabsOpen: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['tabType', 'groupId'],
              properties: {
                tabType: {
                  bsonType: 'string'
                },
                groupId: {
                  bsonType: 'string'
                },
                isSelected: {
                  bsonType: 'bool'
                },
                projectId: {
                  bsonType: 'string'
                }
              },
              additionalProperties: false
            }
          },
          lynxInsightState: {
            bsonType: 'object',
            properties: {
              panelData: {
                bsonType: 'object',
                required: ['isOpen', 'filter', 'sortOrder'],
                properties: {
                  isOpen: {
                    bsonType: 'bool'
                  },
                  filter: {
                    bsonType: 'object',
                    required: ['types', 'scope'],
                    properties: {
                      types: {
                        bsonType: 'array',
                        items: {
                          bsonType: 'string'
                        }
                      },
                      scope: {
                        bsonType: 'string'
                      }
                    }
                  },
                  sortOrder: {
                    bsonType: 'string'
                  }
                }
              },
              assessmentsEnabled: {
                bsonType: 'bool'
              },
              autoCorrectionsEnabled: {
                bsonType: 'bool'
              }
            },
            additionalProperties: false
          },
          selectedDraftTargetParatextId: {
            bsonType: 'string'
          }
        }
      ),
      additionalProperties: false
    };
  }
  setupDomains() {
    return [
      { projectDomain: sf_project_rights_1.SFProjectDomain.ProjectUserConfigs, pathTemplate: this.pathTemplate() }
    ];
  }
}
exports.SFProjectUserConfigService = SFProjectUserConfigService;
//# sourceMappingURL=sf-project-user-config-service.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BiblicalTermService = void 0;
const biblical_term_1 = require('../models/biblical-term');
const sf_project_rights_1 = require('../models/sf-project-rights');
const biblical_term_migrations_1 = require('./biblical-term-migrations');
const sf_project_data_service_1 = require('./sf-project-data-service');
class BiblicalTermService extends sf_project_data_service_1.SFProjectDataService {
  constructor() {
    super(biblical_term_migrations_1.BIBLICAL_TERM_MIGRATIONS);
    this.collection = biblical_term_1.BIBLICAL_TERM_COLLECTION;
    this.indexPaths = biblical_term_1.BIBLICAL_TERM_INDEX_PATHS;
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
            pattern: '[a-z0-9]+'
          },
          termId: {
            bsonType: 'string'
          },
          transliteration: {
            bsonType: 'string'
          },
          renderings: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          description: {
            bsonType: 'string'
          },
          language: {
            bsonType: 'string'
          },
          links: {
            bsonType: 'array',
            items: {
              bsonType: 'string'
            }
          },
          references: {
            bsonType: 'array',
            items: {
              bsonType: 'int'
            }
          },
          definitions: {
            bsonType: 'object',
            patternProperties: {
              '^[A-Za-z-]+$': {
                bsonType: 'object',
                required: ['categories', 'domains', 'gloss', 'notes'],
                properties: {
                  categories: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'string'
                    }
                  },
                  domains: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'string'
                    }
                  },
                  gloss: {
                    bsonType: 'string'
                  },
                  notes: {
                    bsonType: 'string'
                  }
                },
                additionalProperties: false
              }
            },
            additionalProperties: false
          }
        }
      ),
      additionalProperties: false
    };
    // Only renderings and description are user updatable
    const immutableProps = [
      this.pathTemplate(t => t.projectRef),
      this.pathTemplate(t => t.dataId),
      this.pathTemplate(t => t.termId),
      this.pathTemplate(t => t.transliteration),
      this.pathTemplate(t => t.language),
      this.pathTemplate(t => t.links),
      this.pathTemplate(t => t.references),
      this.pathTemplate(t => t.definitions)
    ];
    this.immutableProps.push(...immutableProps);
  }
  setupDomains() {
    return [
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.BiblicalTerms,
        pathTemplate: this.pathTemplate()
      }
    ];
  }
}
exports.BiblicalTermService = BiblicalTermService;
//# sourceMappingURL=biblical-term-service.js.map

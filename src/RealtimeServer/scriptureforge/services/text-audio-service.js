'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TextAudioService = void 0;
const sf_project_rights_1 = require('../models/sf-project-rights');
const text_audio_1 = require('../models/text-audio');
const sf_project_data_service_1 = require('./sf-project-data-service');
const text_audio_migrations_1 = require('./text-audio-migrations');
/**
 * This class manages text audio timing docs.
 */
class TextAudioService extends sf_project_data_service_1.SFProjectDataService {
  constructor() {
    super(text_audio_migrations_1.TEXT_AUDIO_MIGRATIONS);
    this.collection = text_audio_1.TEXT_AUDIO_COLLECTION;
    this.indexPaths = text_audio_1.TEXT_AUDIO_INDEX_PATHS;
    this.validationSchema = {
      bsonType: sf_project_data_service_1.SFProjectDataService.validationSchema.bsonType,
      required: sf_project_data_service_1.SFProjectDataService.validationSchema.required,
      properties: Object.assign(
        Object.assign({}, sf_project_data_service_1.SFProjectDataService.validationSchema.properties),
        {
          _id: {
            bsonType: 'string',
            pattern: '^[0-9a-f]+:[0-9A-Z]+:[0-9]+:target$'
          },
          dataId: {
            bsonType: 'string'
          },
          mimeType: {
            bsonType: 'string'
          },
          audioUrl: {
            bsonType: 'string'
          },
          timings: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['textRef', 'from', 'to'],
              properties: {
                textRef: {
                  bsonType: 'string'
                },
                from: {
                  bsonType: 'number'
                },
                to: {
                  bsonType: 'number'
                }
              },
              additionalProperties: false
            }
          }
        }
      ),
      additionalProperties: false
    };
    const immutableProps = [this.pathTemplate(t => t.dataId)];
    this.immutableProps.push(...immutableProps);
  }
  setupDomains() {
    return [
      {
        projectDomain: sf_project_rights_1.SFProjectDomain.TextAudio,
        pathTemplate: this.pathTemplate()
      }
    ];
  }
}
exports.TextAudioService = TextAudioService;
//# sourceMappingURL=text-audio-service.js.map

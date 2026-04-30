'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TrainingDataService = void 0;
const sf_project_rights_1 = require('../models/sf-project-rights');
const training_data_1 = require('../models/training-data');
const sf_project_data_service_1 = require('./sf-project-data-service');
const training_data_migrations_1 = require('./training-data-migrations');
/**
 * This class manages Serval training data docs.
 */
class TrainingDataService extends sf_project_data_service_1.SFProjectDataService {
  constructor() {
    super(training_data_migrations_1.TRAINING_DATA_MIGRATIONS);
    this.collection = training_data_1.TRAINING_DATA_COLLECTION;
    this.indexPaths = training_data_1.TRAINING_DATA_INDEX_PATHS;
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
          fileUrl: {
            bsonType: 'string'
          },
          mimeType: {
            bsonType: 'string'
          },
          skipRows: {
            bsonType: 'int'
          },
          title: {
            bsonType: 'string'
          },
          deleted: {
            bsonType: 'bool'
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
        projectDomain: sf_project_rights_1.SFProjectDomain.TrainingData,
        pathTemplate: this.pathTemplate()
      }
    ];
  }
}
exports.TrainingDataService = TrainingDataService;
//# sourceMappingURL=training-data-service.js.map

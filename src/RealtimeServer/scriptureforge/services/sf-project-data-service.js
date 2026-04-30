'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SFProjectDataService = void 0;
const project_data_service_1 = require('../../common/services/project-data-service');
const sf_project_rights_1 = require('../models/sf-project-rights');
/**
 * This is the abstract base class for all SF doc services that manage project data.
 */
class SFProjectDataService extends project_data_service_1.ProjectDataService {
  constructor() {
    super(...arguments);
    this.projectRights = sf_project_rights_1.SF_PROJECT_RIGHTS;
  }
}
exports.SFProjectDataService = SFProjectDataService;
//# sourceMappingURL=sf-project-data-service.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DBL_RESOURCE_ID_LENGTH =
  exports.SF_PROJECT_INDEX_PATHS =
  exports.SF_PROJECTS_COLLECTION =
  exports.SF_PROJECT_PROFILES_INDEX_PATHS =
  exports.SF_PROJECT_PROFILES_COLLECTION =
    void 0;
exports.isResource = isResource;
const obj_path_1 = require('../../common/utils/obj-path');
exports.SF_PROJECT_PROFILES_COLLECTION = 'sf_projects_profile';
exports.SF_PROJECT_PROFILES_INDEX_PATHS = [];
exports.SF_PROJECTS_COLLECTION = 'sf_projects';
exports.SF_PROJECT_INDEX_PATHS = [
  (0, obj_path_1.obj)().pathStr(p => p.name),
  (0, obj_path_1.obj)().pathStr(p => p.paratextId),
  // Index for ParatextService.GetBiblicalTermsAsync() in .NET
  (0, obj_path_1.obj)().pathStr(p => p.shortName),
  // Indexes for SFProjectService.IsSourceProject() in .NET
  [(0, obj_path_1.obj)().pathStr(p => p.translateConfig.source.projectRef), { sparse: true }],
  ['translateConfig.draftConfig.draftingSources.projectRef', { sparse: true }],
  ['translateConfig.draftConfig.trainingSources.projectRef', { sparse: true }]
];
/** Length of id for a DBL resource. */
exports.DBL_RESOURCE_ID_LENGTH = 16;
/** Is the SF project that of a DBL resource, rather than a typical PT project? */
function isResource(project) {
  const resourceIdLength = exports.DBL_RESOURCE_ID_LENGTH;
  return project.paratextId.length === resourceIdLength;
}
//# sourceMappingURL=sf-project.js.map

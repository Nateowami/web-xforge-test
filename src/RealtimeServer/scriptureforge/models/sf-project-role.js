'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SFProjectRole = void 0;
exports.isParatextRole = isParatextRole;
exports.isTranslateRole = isTranslateRole;
function isParatextRole(role) {
  switch (role) {
    case SFProjectRole.ParatextAdministrator:
    case SFProjectRole.ParatextTranslator:
    case SFProjectRole.ParatextConsultant:
    case SFProjectRole.ParatextObserver:
      return true;
    default:
      return false;
  }
}
function isTranslateRole(role) {
  if (isParatextRole(role)) {
    return true;
  }
  switch (role) {
    case SFProjectRole.Commenter:
    case SFProjectRole.Viewer:
      return true;
    default:
      return false;
  }
}
var SFProjectRole;
(function (SFProjectRole) {
  SFProjectRole['ParatextAdministrator'] = 'pt_administrator';
  SFProjectRole['ParatextTranslator'] = 'pt_translator';
  SFProjectRole['ParatextConsultant'] = 'pt_consultant';
  SFProjectRole['ParatextObserver'] = 'pt_observer';
  SFProjectRole['CommunityChecker'] = 'sf_community_checker';
  SFProjectRole['Commenter'] = 'sf_commenter';
  SFProjectRole['Viewer'] = 'sf_observer';
  SFProjectRole['None'] = 'none';
})(SFProjectRole || (exports.SFProjectRole = SFProjectRole = {}));
//# sourceMappingURL=sf-project-role.js.map

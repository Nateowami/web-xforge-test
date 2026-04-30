'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthType =
  exports.USER_INDEX_PATHS =
  exports.USERS_COLLECTION =
  exports.USER_PROFILE_INDEX_PATHS =
  exports.USER_PROFILES_COLLECTION =
    void 0;
exports.getAuthType = getAuthType;
exports.isPTUser = isPTUser;
const obj_path_1 = require('../utils/obj-path');
exports.USER_PROFILES_COLLECTION = 'user_profiles';
exports.USER_PROFILE_INDEX_PATHS = [];
exports.USERS_COLLECTION = 'users';
exports.USER_INDEX_PATHS = [
  // Index for ParatextService.GetBiblicalTermsAsync() in .NET
  (0, obj_path_1.obj)().pathStr(u => u.email),
  // Index for SFProjectService.InviteAsync() in .NET
  (0, obj_path_1.obj)().pathStr(u => u.paratextId)
];
var AuthType;
(function (AuthType) {
  AuthType[(AuthType['Unknown'] = 0)] = 'Unknown';
  AuthType[(AuthType['Paratext'] = 1)] = 'Paratext';
  AuthType[(AuthType['Google'] = 2)] = 'Google';
  AuthType[(AuthType['Facebook'] = 3)] = 'Facebook';
  AuthType[(AuthType['Account'] = 4)] = 'Account';
})(AuthType || (exports.AuthType = AuthType = {}));
function getAuthType(authId) {
  if (authId == null || !authId.includes('|')) {
    return AuthType.Unknown;
  }
  const authIdType = authId.substring(0, authId.lastIndexOf('|'));
  if (authIdType.includes('paratext')) {
    return AuthType.Paratext;
  }
  if (authIdType.includes('google')) {
    return AuthType.Google;
  }
  if (authIdType.includes('facebook')) {
    return AuthType.Facebook;
  }
  if (authIdType.includes('auth0')) {
    return AuthType.Account;
  }
  return AuthType.Unknown;
}
/** Do we understand the SF user to also be a PT user? */
function isPTUser(user) {
  return user.paratextId != null;
}
//# sourceMappingURL=user.js.map

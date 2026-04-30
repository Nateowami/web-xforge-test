'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestUserProfile = createTestUserProfile;
exports.createTestUser = createTestUser;
const merge_1 = __importDefault(require('lodash/merge'));
const system_role_1 = require('./system-role');
function testUserProfile(ordinal) {
  return {
    displayName: `Test user ${ordinal}`,
    avatarUrl: `https://cdn.auth0.com/avatars/${ordinal}.png`
  };
}
function testUser(ordinal) {
  return Object.assign(Object.assign({}, testUserProfile(ordinal)), {
    name: `Name of test user ${ordinal}`,
    email: `user${ordinal}@example.com`,
    roles: [system_role_1.SystemRole.User],
    isDisplayNameConfirmed: false,
    interfaceLanguage: 'en',
    authId: `authId${ordinal}`,
    sites: {}
  });
}
function createTestUserProfile(overrides, ordinal = 1) {
  return (0, merge_1.default)(testUserProfile(ordinal), overrides);
}
function createTestUser(overrides, ordinal = 1) {
  return (0, merge_1.default)(testUser(ordinal), overrides);
}
//# sourceMappingURL=user-test-data.js.map

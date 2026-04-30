'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProjectRights = exports.Operation = void 0;
var Operation;
(function (Operation) {
  Operation['Create'] = 'create';
  Operation['Edit'] = 'edit';
  Operation['Delete'] = 'delete';
  Operation['View'] = 'view';
  Operation['EditOwn'] = 'edit_own';
  Operation['DeleteOwn'] = 'delete_own';
  Operation['ViewOwn'] = 'view_own';
})(Operation || (exports.Operation = Operation = {}));
/**
 * NOTE: When updating this class, be sure to update SFProjectRights in C#.
 */
class ProjectRights {
  constructor(rights = {}) {
    this.rights = new Map();
    for (const role in rights) {
      if (Object.prototype.hasOwnProperty.call(rights, role)) {
        this.addRights(role, rights[role]);
      }
    }
  }
  hasRight(project, userId, projectDomain, operation, data) {
    const userRole = project.userRoles[userId];
    const rights = (this.rights.get(userRole) || [])
      .concat((project.userPermissions || {})[userId] || [])
      .concat((project.rolePermissions || {})[userRole] || []);
    if (rights.includes(this.joinRight(projectDomain, operation))) {
      return operation === Operation.Create && userId != null && data != null ? userId === data.ownerRef : true;
    }
    let ownOperation;
    switch (operation) {
      case Operation.Edit:
        ownOperation = Operation.EditOwn;
        break;
      case Operation.View:
        ownOperation = Operation.ViewOwn;
        break;
      case Operation.Delete:
        ownOperation = Operation.DeleteOwn;
        break;
      default:
        return false;
    }
    return (
      userId != null &&
      (data === null || data === void 0 ? void 0 : data.ownerRef) === userId &&
      rights.includes(this.joinRight(projectDomain, ownOperation))
    );
  }
  /**
   * Checks whether a project role has a right.
   * WARNING: Use hasRight instead in nearly every case. This method should only be used if the project document does not
   * yet exist, or if the user has not yet gained access to it.
   */
  roleHasRight(role, projectDomain, operation) {
    return (this.rights.get(role) || []).includes(this.joinRight(projectDomain, operation));
  }
  joinRight(domain, operation) {
    return domain + '.' + operation;
  }
  addRights(role, rights) {
    this.rights.set(role, Array.from(new Set(rights.map(r => this.joinRight(r[0], r[1])))));
  }
}
exports.ProjectRights = ProjectRights;
//# sourceMappingURL=project-rights.js.map

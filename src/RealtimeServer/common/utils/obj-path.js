'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ObjPathTemplate = exports.ObjPathBuilder = exports.ANY_INDEX = exports.ANY_KEY = void 0;
exports.getValue = getValue;
exports.obj = obj;
const ts_object_path_1 = require('ts-object-path');
exports.ANY_KEY = '*';
exports.ANY_INDEX = -1;
function getValue(object, path, defaultValue) {
  return path.reduce((o, key) => (o != null && o[key] !== undefined ? o[key] : defaultValue), object);
}
function obj() {
  return new ObjPathBuilder();
}
class ObjPathBuilder {
  path(field) {
    if (field == null) {
      return [];
    }
    return (0, ts_object_path_1.getPath)(field);
  }
  pathStr(field) {
    if (field == null) {
      return '';
    }
    return (0, ts_object_path_1.getPath)(field).join('.');
  }
  pathTemplate(field, inherit = true) {
    if (field == null) {
      return new ObjPathTemplate();
    }
    return new ObjPathTemplate((0, ts_object_path_1.getPath)(field), inherit);
  }
}
exports.ObjPathBuilder = ObjPathBuilder;
/**
 * This class represents the generic template for a path to a property in an object.
 */
class ObjPathTemplate {
  constructor(template = [], inherit = true) {
    this.template = template;
    this.inherit = inherit;
  }
  matches(path) {
    if (
      (this.inherit && path.length < this.template.length) ||
      (!this.inherit && path.length !== this.template.length)
    ) {
      return false;
    }
    for (let j = 0; j < this.template.length; j++) {
      if (this.template[j] === exports.ANY_INDEX) {
        if (typeof path[j] !== 'number') {
          return false;
        }
      } else if (this.template[j] !== exports.ANY_KEY && this.template[j] !== path[j]) {
        return false;
      }
    }
    return true;
  }
}
exports.ObjPathTemplate = ObjPathTemplate;
//# sourceMappingURL=obj-path.js.map

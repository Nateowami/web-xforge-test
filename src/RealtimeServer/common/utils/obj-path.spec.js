'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const obj_path_1 = require('./obj-path');
describe('ObjPathTemplate', () => {
  it('supports index wildcard', () => {
    const template = new obj_path_1.ObjPathTemplate(['arrayProp', obj_path_1.ANY_INDEX, 'prop']);
    expect(template.matches(['arrayProp', 0, 'prop'])).toBe(true);
    expect(template.matches(['arrayProp', 'key', 'prop'])).toBe(false);
  });
  it('supports key wildcard', () => {
    const template = new obj_path_1.ObjPathTemplate(['objectProp', obj_path_1.ANY_KEY, 'prop']);
    expect(template.matches(['objectProp', 'key', 'prop'])).toBe(true);
  });
  it('inherits when flag set to true', () => {
    const template = new obj_path_1.ObjPathTemplate(['objectProp', 'key'], true);
    expect(template.matches(['objectProp'])).toBe(false);
    expect(template.matches(['objectProp', 'key'])).toBe(true);
    expect(template.matches(['objectProp', 'key', 'prop'])).toBe(true);
  });
  it('does not inherit when flag set to false', () => {
    const template = new obj_path_1.ObjPathTemplate(['objectProp', 'key'], false);
    expect(template.matches(['objectProp'])).toBe(false);
    expect(template.matches(['objectProp', 'key'])).toBe(true);
    expect(template.matches(['objectProp', 'key', 'prop'])).toBe(false);
  });
});
//# sourceMappingURL=obj-path.spec.js.map

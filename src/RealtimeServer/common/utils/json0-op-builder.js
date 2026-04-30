'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Json0OpBuilder = void 0;
const ts_object_path_1 = require('ts-object-path');
const eq_1 = require('./eq');
const obj_path_1 = require('./obj-path');
class Json0OpBuilder {
  constructor(data) {
    this.data = data;
    this.op = [];
  }
  /**
   * Inserts an item into the specified array at the specified index.
   *
   * @param {ObjProxyArg<T, TItem[]>} field The path to the array.
   * @param {number} index The index.
   * @param {TItem} item The item to insert.
   */
  insert(field, index, item) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathInsert(path, index, item);
  }
  /**
   * Inserts an item into the specified array at the specified index.
   *
   * @param {PathItem[]} path The path to the array.
   * @param {number} index The index.
   * @param {any} item The item to insert.
   */
  pathInsert(path, index, item) {
    path = path.concat([index]);
    this.op.push({ p: path, li: item });
    return this;
  }
  /**
   * Adds an item to the end of the specified array.
   *
   * @param {ObjProxyArg<T, TItem[]>} field The path to the array.
   * @param {TItem} item The item to add.
   */
  add(field, item) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathAdd(path, item);
  }
  /**
   * Adds an item to the end of the specified array.
   *
   * @param {PathItem[]} path The path to the array.
   * @param {any} item The item to add.
   */
  pathAdd(path, item) {
    const list = (0, obj_path_1.getValue)(this.data, path);
    path = path.concat([list.length]);
    this.op.push({ p: path, li: item });
    return this;
  }
  /**
   * Removes an item from the specified array at the specified index.
   *
   * @param {ObjProxyArg<T, TItem[]>} field The path to the array.
   * @param {number} index The index.
   * @param {TItem} [item] The item to remove. It is usually not necessary to provide this unless a previous operation
   * in the builder has altered the item in some way.
   */
  remove(field, index, item) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathRemove(path, index, item);
  }
  /**
   * Removes an item from the specified array at the specified index.
   *
   * @param {PathItem[]} path The path to the array.
   * @param {number} index The index.
   * @param {any} [item] The item to remove. It is usually not necessary to provide this unless a previous operation
   * in the builder has altered the item in some way.
   */
  pathRemove(path, index, item) {
    if (item === undefined) {
      const list = (0, obj_path_1.getValue)(this.data, path);
      item = list[index];
    }
    path = path.concat([index]);
    this.op.push({ p: path, ld: item });
    return this;
  }
  /**
   * Replaces an item in the specified array at the specified index.
   *
   * @param {ObjProxyArg<T, TItem[]>} field The path to the array.
   * @param {number} index The index.
   * @param {TItem} newItem The new item.
   * @param {TItem} [oldItem] The item to replace. It is usually not necessary to provide this unless a previous
   * operation in the builder has altered the item in some way.
   */
  replace(field, index, newItem, oldItem) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathReplace(path, index, newItem, oldItem);
  }
  /**
   * Replaces an item in the specified array at the specified index.
   *
   * @param {PathItem[]} path The path to the array.
   * @param {number} index The index.
   * @param {any} newItem The new item.
   * @param {any} [oldItem] The item to replace. It is usually not necessary to provide this unless a previous
   * operation in the builder has altered the item in some way.
   */
  pathReplace(path, index, newItem, oldItem) {
    if (oldItem === undefined) {
      const list = (0, obj_path_1.getValue)(this.data, path);
      oldItem = list[index];
    }
    if (!(0, eq_1.eq)(oldItem, newItem)) {
      path.push(index);
      this.op.push({ p: path, li: newItem, ld: oldItem });
    }
    return this;
  }
  /**
   * Sets the specified field to the specified value.
   *
   * @param {ObjProxyArg<T, TField>} field The path to the field.
   * @param {TField} newValue The new value.
   * @param {TField} [oldValue] The current value. It is usually not necessary to provide this unless a previous
   * operation in the builder has altered the field in some way.
   */
  set(field, newValue, oldValue) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathSet(path, newValue, oldValue);
  }
  /**
   * Sets the specified field to the specified value.
   *
   * @param {PathItem[]} path The path to the field.
   * @param {any} newValue The new value.
   * @param {any} [oldValue] The current value. It is usually not necessary to provide this unless a previous
   * operation in the builder has altered the field in some way.
   */
  pathSet(path, newValue, oldValue) {
    if (oldValue === undefined) {
      oldValue = (0, obj_path_1.getValue)(this.data, path);
    }
    if (!(0, eq_1.eq)(newValue, oldValue)) {
      this.op.push({ p: path, oi: newValue, od: oldValue });
    }
    return this;
  }
  /**
   * Unsets the specified field.
   *
   * @param {ObjProxyArg<T, TField>} field The path to the field.
   * @param {TField} [value] The current value. It is usually not necessary to provide this unless a previous operation
   * in the builder has altered the field in some way.
   */
  unset(field, value) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathUnset(path, value);
  }
  /**
   * Unsets the specified field.
   *
   * @param {PathItem[]} path The path to the field.
   * @param {any} [value] The current value. It is usually not necessary to provide this unless a previous operation
   * in the builder has altered the field in some way.
   */
  pathUnset(path, value) {
    if (value === undefined) {
      value = (0, obj_path_1.getValue)(this.data, path);
    }
    if (value !== undefined) {
      this.op.push({ p: path, od: value });
    }
    return this;
  }
  /**
   * Increments/decrements the specified field by the specified amount.
   *
   * @param {ObjProxyArg<T, number>} field The path to the field.
   * @param {number} [n=1] The amount to increment/decrement the field. Use negative values to decrement.
   */
  inc(field, n = 1) {
    const path = (0, ts_object_path_1.getPath)(field);
    return this.pathInc(path, n);
  }
  /**
   * Increments/decrements the specified field by the specified amount.
   *
   * @param {PathItem[]} path The path to the field.
   * @param {number} [n=1] The amount to increment/decrement the field. Use negative values to decrement.
   */
  pathInc(path, n = 1) {
    this.op.push({ p: path, na: n });
    return this;
  }
}
exports.Json0OpBuilder = Json0OpBuilder;
//# sourceMappingURL=json0-op-builder.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MetadataDB = MetadataDB;
/**
 * This mixin extends ShareDB database adapters to return metadata when retrieving ops.
 */
function MetadataDB(Base) {
  return class extends Base {
    getOpsToSnapshot(collection, id, from, snapshot, options, callback) {
      options !== null && options !== void 0 ? options : (options = {});
      options.metadata = true;
      super.getOpsToSnapshot(collection, id, from, snapshot, options, callback);
    }
  };
}
//# sourceMappingURL=metadata-db.js.map

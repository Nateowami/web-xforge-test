'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SchemaVersionRepository = void 0;
class SchemaVersionRepository {
  constructor(database) {
    this.collection = database.collection('schema_versions');
  }
  createIndex() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.collection.createIndex({ collection: 1 });
    });
  }
  getAll() {
    return this.collection.find().toArray();
  }
  set(collection, version) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.collection.updateOne({ collection }, { $set: { version } }, { upsert: true });
    });
  }
}
exports.SchemaVersionRepository = SchemaVersionRepository;
//# sourceMappingURL=schema-version-repository.js.map

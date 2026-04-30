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
exports.docFetch = docFetch;
exports.docCreate = docCreate;
exports.docSubmitOp = docSubmitOp;
exports.docSubmitJson0Op = docSubmitJson0Op;
exports.docDelete = docDelete;
exports.createFetchQuery = createFetchQuery;
const json0_op_builder_1 = require('./json0-op-builder');
function docFetch(doc) {
  return new Promise((resolve, reject) => {
    doc.fetch(err => {
      if (err != null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
function docCreate(doc, data, type, source = undefined) {
  const options = source != null ? { source } : {};
  return new Promise((resolve, reject) => {
    doc.create(data, type, options, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
function docSubmitOp(doc, components, source = undefined) {
  const options = source != null ? { source } : {};
  return new Promise((resolve, reject) => {
    doc.submitOp(components, options, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
function docSubmitJson0Op(doc_1, build_1) {
  return __awaiter(this, arguments, void 0, function* (doc, build, source = undefined) {
    const builder = new json0_op_builder_1.Json0OpBuilder(doc.data);
    build(builder);
    if (builder.op.length > 0) {
      yield docSubmitOp(doc, builder.op, source);
      return true;
    }
    return false;
  });
}
function docDelete(doc) {
  return new Promise((resolve, reject) => {
    doc.del({}, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
function createFetchQuery(conn, collection, query) {
  return new Promise((resolve, reject) => {
    const queryObj = conn.createFetchQuery(collection, query, {}, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve(queryObj);
      }
    });
  });
}
//# sourceMappingURL=sharedb-utils.js.map

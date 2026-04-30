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
exports.clientConnect = clientConnect;
exports.fetchDoc = fetchDoc;
exports.hasDoc = hasDoc;
exports.createDoc = createDoc;
exports.submitOp = submitOp;
exports.submitJson0Op = submitJson0Op;
exports.deleteDoc = deleteDoc;
exports.allowAll = allowAll;
exports.flushPromises = flushPromises;
const system_role_1 = require('../models/system-role');
const realtime_server_1 = require('../realtime-server');
const sharedb_utils_1 = require('./sharedb-utils');
function clientConnect(server, userId, role = system_role_1.SystemRole.User) {
  return server.connect(undefined, {
    user: { [realtime_server_1.XF_USER_ID_CLAIM]: userId, [realtime_server_1.XF_ROLE_CLAIM]: role }
  });
}
function fetchDoc(conn, collection, id) {
  return __awaiter(this, void 0, void 0, function* () {
    const doc = conn.get(collection, id);
    yield (0, sharedb_utils_1.docFetch)(doc);
    return doc;
  });
}
function hasDoc(conn, collection, id) {
  return __awaiter(this, void 0, void 0, function* () {
    const doc = conn.get(collection, id);
    yield (0, sharedb_utils_1.docFetch)(doc);
    return doc.data != null;
  });
}
function createDoc(conn, collection, id, data, type, source = undefined) {
  const doc = conn.get(collection, id);
  if (source != null) {
    doc.submitSource = true;
  }
  return (0, sharedb_utils_1.docCreate)(doc, data, type, source);
}
function submitOp(conn_1, collection_1, id_1, components_1) {
  return __awaiter(this, arguments, void 0, function* (conn, collection, id, components, source = undefined) {
    const doc = conn.get(collection, id);
    yield (0, sharedb_utils_1.docFetch)(doc);
    if (source != null) {
      doc.submitSource = true;
    }
    yield (0, sharedb_utils_1.docSubmitOp)(doc, components, source);
  });
}
function submitJson0Op(conn_1, collection_1, id_1, build_1) {
  return __awaiter(this, arguments, void 0, function* (conn, collection, id, build, source = undefined) {
    const doc = conn.get(collection, id);
    yield (0, sharedb_utils_1.docFetch)(doc);
    if (source != null) {
      doc.submitSource = true;
    }
    return yield (0, sharedb_utils_1.docSubmitJson0Op)(doc, build, source);
  });
}
function deleteDoc(conn, collection, id) {
  return __awaiter(this, void 0, void 0, function* () {
    const doc = conn.get(collection, id);
    yield (0, sharedb_utils_1.docFetch)(doc);
    yield (0, sharedb_utils_1.docDelete)(doc);
  });
}
function allowAll(server, collection) {
  server.allowCreate(collection, () => true);
  server.allowDelete(collection, () => true);
  server.allowRead(collection, () => true);
  server.allowUpdate(collection, () => true);
}
function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}
//# sourceMappingURL=test-utils.js.map

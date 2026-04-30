'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.WebSocketStreamListener = void 0;
const express_1 = __importDefault(require('express'));
const fs_1 = __importDefault(require('fs'));
const http_1 = __importDefault(require('http'));
const https_1 = __importDefault(require('https'));
const jsonwebtoken_1 = require('jsonwebtoken');
const jwks_rsa_1 = __importDefault(require('jwks-rsa'));
const websocket_json_stream_1 = __importDefault(require('websocket-json-stream'));
const ws_1 = __importDefault(require('ws'));
function isLocalRequest(request) {
  const addr = request.socket.remoteAddress;
  return addr === '127.0.0.1' || addr === '::ffff:127.0.0.1' || addr === '::1';
}
class WebSocketStreamListener {
  constructor(audience, scope, authority, port, certificatePath, privateKeyPath, origin, exceptionReporter) {
    this.audience = audience;
    this.scope = scope;
    this.port = port;
    this.origin = origin;
    this.exceptionReporter = exceptionReporter;
    this.verifyClient = (info, callback) => {
      if (!this.origin.includes(info.origin)) {
        callback(false, 401, 'Unauthorized');
      } else {
        this.verifyToken(info.req, callback);
      }
    };
    // Create web servers to serve files and listen to WebSocket connections
    const app = (0, express_1.default)();
    app.use(express_1.default.static('static'));
    app.use((err, _req, res, _next) => {
      console.error(err);
      res.status(500).send('500 Internal Server Error');
      this.exceptionReporter.report(err);
    });
    if (certificatePath != null && privateKeyPath != null) {
      // Load SSL certificates
      const options = {
        cert: fs_1.default.readFileSync(certificatePath),
        key: fs_1.default.readFileSync(privateKeyPath)
      };
      this.httpServer = https_1.default.createServer(options, app);
    } else {
      this.httpServer = http_1.default.createServer(app);
    }
    this.jwksClient = (0, jwks_rsa_1.default)({
      cache: true,
      jwksUri: `${authority}.well-known/jwks.json`
    });
  }
  listen(backend) {
    // Connect any incoming WebSocket connection to ShareDB
    const wss = new ws_1.default.Server({
      server: this.httpServer,
      verifyClient: this.verifyClient
    });
    wss.on('connection', (webSocket, req) => {
      const stream = new websocket_json_stream_1.default(webSocket);
      backend.listen(stream, req);
    });
  }
  start() {
    return new Promise((resolve, reject) => {
      this.httpServer.once('error', err => {
        console.error(err);
        this.exceptionReporter.report(err);
        reject(err);
      });
      this.httpServer.once('listening', () => resolve());
      this.httpServer.listen(this.port);
    });
  }
  stop() {
    this.httpServer.close();
  }
  verifyToken(req, done) {
    const url = req.url;
    if (url != null && url.includes('?access_token=')) {
      // the url contains an access token
      const token = url.split('?access_token=')[1];
      (0, jsonwebtoken_1.verify)(
        token,
        (header, verifyDone) => this.getKey(header, verifyDone),
        { audience: this.audience },
        (err, decoded) => {
          if (err) {
            // unable to verify access token
            done(false, 401, 'Unauthorized');
          } else {
            // check that the access token was granted xForge API scope
            const scopeClaim = decoded['scope'];
            if (scopeClaim != null && scopeClaim.split(' ').includes(this.scope)) {
              req.user = decoded;
              done(true);
            } else {
              done(false, 401, 'A required scope has not been granted.');
            }
          }
        }
      );
    } else if (isLocalRequest(req) && url != null && url.includes('?server=true')) {
      // no access token, but the request is local, so it is allowed
      done(true);
    } else {
      // no access token and not local, so it is unauthorized
      done(false, 401, 'Unauthorized');
    }
  }
  getKey(header, done) {
    if (header.kid == null) {
      done(new Error('No key ID.'));
      return;
    }
    this.jwksClient
      .getSigningKey(header.kid)
      .then(key => done(null, key.getPublicKey()))
      .catch(done);
  }
}
exports.WebSocketStreamListener = WebSocketStreamListener;
//# sourceMappingURL=web-socket-stream-listener.js.map

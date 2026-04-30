import ShareDB from 'sharedb';
import { OTType } from 'sharedb/lib/client';
import './diagnostics';
type InteropCallback = (err?: any, ret?: any) => void;
interface RealtimeServerOptions {
  appModuleName: string;
  connectionString: string;
  port: number;
  securePort: number;
  certificatePath: string;
  privateKeyPath: string;
  audience: string;
  scope: string;
  authority: string;
  origin: string;
  bugsnagApiKey: string;
  releaseStage: string;
  migrationsDisabled: boolean;
  dataValidationDisabled: boolean;
  siteId: string;
  version: string;
}
declare const _default: {
  start: (callback: InteropCallback, options: RealtimeServerOptions) => void;
  stop: (callback: InteropCallback) => void;
  isServerRunning: (callback: InteropCallback) => void;
  connect: (callback: InteropCallback, userId?: string) => void;
  disconnect: (callback: InteropCallback, handle: number) => void;
  createDoc: (
    callback: InteropCallback,
    handle: number,
    collection: string,
    id: string,
    data: any,
    typeName: OTType,
    source: string | undefined
  ) => void;
  fetchDoc: (callback: InteropCallback, handle: number, collection: string, id: string) => void;
  fetchDocs: (callback: InteropCallback, handle: number, collection: string, ids: string[]) => void;
  fetchSnapshotByTimestamp: (
    callback: InteropCallback,
    handle: number,
    collection: string,
    id: string,
    timestamp: number
  ) => void;
  getOps: (callback: InteropCallback, collection: string, id: string) => void;
  submitOp: (
    callback: InteropCallback,
    handle: number,
    collection: string,
    id: string,
    ops: ShareDB.Op[],
    source: string | undefined
  ) => void;
  deleteDoc: (callback: InteropCallback, handle: number, collection: string, id: string) => void;
  applyOp: (callback: InteropCallback, typeName: string, data: any, ops: ShareDB.Op[]) => void;
  replaceDoc: (
    callback: InteropCallback,
    handle: number,
    collection: string,
    id: string,
    data: any,
    source: string | undefined
  ) => void;
};
export = _default;

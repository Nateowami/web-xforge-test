import { Connection, Doc, OTType } from 'sharedb/lib/client';
import { SystemRole } from '../models/system-role';
import { RealtimeServer } from '../realtime-server';
import { Json0OpBuilder } from './json0-op-builder';
export declare function clientConnect(server: RealtimeServer, userId: string, role?: SystemRole): Connection;
export declare function fetchDoc(conn: Connection, collection: string, id: string): Promise<Doc>;
export declare function hasDoc(conn: Connection, collection: string, id: string): Promise<boolean>;
export declare function createDoc<T>(
  conn: Connection,
  collection: string,
  id: string,
  data: T,
  type?: OTType,
  source?: boolean | any | undefined
): Promise<void>;
export declare function submitOp(
  conn: Connection,
  collection: string,
  id: string,
  components: any,
  source?: boolean | any | undefined
): Promise<void>;
export declare function submitJson0Op<T>(
  conn: Connection,
  collection: string,
  id: string,
  build: (op: Json0OpBuilder<T>) => void,
  source?: boolean | any | undefined
): Promise<boolean>;
export declare function deleteDoc(conn: Connection, collection: string, id: string): Promise<void>;
export declare function allowAll(server: RealtimeServer, collection: string): void;
export declare function flushPromises(): Promise<void>;

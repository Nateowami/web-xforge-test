import { Connection, Doc, OTType, Query } from 'sharedb/lib/client';
import { Json0OpBuilder } from './json0-op-builder';
export declare function docFetch(doc: Doc): Promise<void>;
export declare function docCreate(
  doc: Doc,
  data: any,
  type?: OTType,
  source?: boolean | any | undefined
): Promise<void>;
export declare function docSubmitOp(doc: Doc, components: any, source?: boolean | any | undefined): Promise<void>;
export declare function docSubmitJson0Op<T>(
  doc: Doc,
  build: (op: Json0OpBuilder<T>) => void,
  source?: boolean | any | undefined
): Promise<boolean>;
export declare function docDelete(doc: Doc): Promise<void>;
export declare function createFetchQuery(conn: Connection, collection: string, query: any): Promise<Query>;

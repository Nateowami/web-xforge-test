import ShareDB from 'sharedb';
export type DBConstructor<T extends ShareDB.DB = ShareDB.DB> = new (...args: any[]) => T;
/**
 * This mixin extends ShareDB database adapters to return metadata when retrieving ops.
 */
export declare function MetadataDB<T extends DBConstructor>(Base: T): T;

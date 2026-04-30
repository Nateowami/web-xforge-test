import { Db } from 'mongodb';
import { SchemaVersion } from './models/schema-version';
export declare class SchemaVersionRepository {
  private readonly collection;
  constructor(database: Db);
  createIndex(): Promise<void>;
  getAll(): Promise<SchemaVersion[]>;
  set(collection: string, version: number): Promise<void>;
}

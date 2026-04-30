import { CreateIndexesOptions, Db, IndexSpecification } from 'mongodb';
import { ConnectSession } from '../connect-session';
import { Migration, MigrationConstructor } from '../migration';
import { ValidationSchema } from '../models/validation-schema';
import { RealtimeServer } from '../realtime-server';
/**
 * This is the abstract base class for all doc services. Doc services are responsible for managing data for a
 * particular doc type.
 */
export declare abstract class DocService<T = any> {
  readonly schemaVersion: number;
  protected server?: RealtimeServer;
  private readonly migrations;
  static readonly validationSchema: ValidationSchema;
  constructor(migrations: MigrationConstructor[]);
  abstract get collection(): string;
  protected abstract get indexPaths(): (string | IndexSpecification | [string, CreateIndexesOptions])[];
  validationSchema: ValidationSchema | undefined;
  init(server: RealtimeServer): void;
  getMigration(version: number): Migration;
  createIndexes(db: Db): Promise<void>;
  addValidationSchema(db: Db): Promise<void>;
  protected addUpdateListener(server: RealtimeServer, handler: (docId: string, ops: any) => Promise<void>): void;
  protected allowCreate(_docId: string, _doc: T, session: ConnectSession): Promise<boolean> | boolean;
  protected allowDelete(_docId: string, _doc: T, session: ConnectSession): Promise<boolean> | boolean;
  protected allowRead(_docId: string, _doc: T, session: ConnectSession): Promise<boolean> | boolean;
  protected allowUpdate(
    _docId: string,
    _oldDoc: T,
    _newDoc: T,
    _ops: any,
    session: ConnectSession
  ): Promise<boolean> | boolean;
}

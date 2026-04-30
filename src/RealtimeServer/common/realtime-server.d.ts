import { Db } from 'mongodb';
import ShareDB from 'sharedb';
import shareDBAccess from 'sharedb-access';
import { Connection, Doc, Op } from 'sharedb/lib/client';
import { Project } from './models/project';
import { SchemaVersionRepository } from './schema-version-repository';
import { DocService } from './services/doc-service';
export declare const XF_USER_ID_CLAIM = 'http://xforge.org/userid';
export declare const XF_ROLE_CLAIM = 'http://xforge.org/role';
export type RealtimeServerConstructor = new (
  siteId: string,
  migrationsDisabled: boolean,
  dataValidationDisabled: boolean,
  db: ShareDB.DB,
  schemaVersions: SchemaVersionRepository,
  milestoneDb?: ShareDB.MilestoneDB
) => RealtimeServer;
/**
 * Submits a migration op to the specified doc.
 *
 * @param {number} version The migration version.
 * @param {Doc} doc The doc.
 * @param {Op[]} ops The ops.
 * @returns {Promise<void>}
 */
export declare function submitMigrationOp(version: number, doc: Doc, ops: Op[]): Promise<void>;
export interface RealtimeServer extends ShareDB, shareDBAccess.AccessControlBackend {}
/**
 * This class represents the real-time server. It extends ShareDB and adds support for migrations and access control.
 */
export declare class RealtimeServer extends ShareDB {
  private readonly siteId;
  readonly migrationsDisabled: boolean;
  readonly dataValidationDisabled: boolean;
  private readonly projectsCollection;
  readonly db: ShareDB.DB;
  private readonly schemaVersions;
  private readonly docServices;
  private defaultConnection?;
  constructor(
    siteId: string,
    migrationsDisabled: boolean,
    dataValidationDisabled: boolean,
    docServices: DocService[],
    projectsCollection: string,
    db: ShareDB.DB,
    schemaVersions: SchemaVersionRepository,
    milestoneDb?: ShareDB.MilestoneDB
  );
  addValidationSchema(db: Db): Promise<void>;
  createIndexes(db: Db): Promise<void>;
  connect(userId?: string): Connection;
  connect(connection?: Connection, req?: any): Connection;
  listen(stream: any, req?: any): ShareDB.Agent;
  getProject(projectId: string): Promise<Project | undefined>;
  migrateIfNecessary(): Promise<void>;
  private setConnectSession;
}

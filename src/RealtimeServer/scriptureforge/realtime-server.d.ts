import ShareDB from 'sharedb';
import { RealtimeServer } from '../common/realtime-server';
import { SchemaVersionRepository } from '../common/schema-version-repository';
/**
 * This class represents the SF real-time server.
 */
export default class SFRealtimeServer extends RealtimeServer {
  constructor(
    siteId: string,
    migrationsDisabled: boolean,
    dataValidationDisabled: boolean,
    db: ShareDB.DB,
    schemaVersions: SchemaVersionRepository,
    milestoneDb?: ShareDB.MilestoneDB
  );
}

import { ConnectSession } from '../../common/connect-session';
import { MigrationConstructor } from '../../common/migration';
import { ValidationSchema } from '../../common/models/validation-schema';
import { RealtimeServer } from '../../common/realtime-server';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { ProjectService } from '../../common/services/project-service';
import { SFProject } from '../models/sf-project';
import { SFProjectRole } from '../models/sf-project-role';
/**
 * This class manages SF project docs.
 */
export declare class SFProjectService extends ProjectService<SFProject> {
  readonly collection = 'sf_projects';
  protected readonly indexPaths: (string | [string, import('mongodb').CreateIndexesOptions])[];
  protected readonly projectAdminRole = SFProjectRole.ParatextAdministrator;
  readonly validationSchema: ValidationSchema;
  constructor(sfProjectMigrations: MigrationConstructor[]);
  init(server: RealtimeServer): void;
  protected allowRead(docId: string, doc: SFProject, session: ConnectSession): boolean;
  protected setupDomains(): ProjectDomainConfig[];
  private hasRight;
}

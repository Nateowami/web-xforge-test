import { MigrationConstructor } from '../../common/migration';
import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { SFProjectUserConfig } from '../models/sf-project-user-config';
import { SFProjectDataService } from './sf-project-data-service';
/**
 * This class manages project-user configuration docs.
 */
export declare class SFProjectUserConfigService extends SFProjectDataService<SFProjectUserConfig> {
  readonly collection = 'sf_project_user_configs';
  protected readonly indexPaths: string[];
  readonly validationSchema: ValidationSchema;
  constructor(sfProjectUserConfigMigrations: MigrationConstructor[]);
  protected setupDomains(): ProjectDomainConfig[];
}

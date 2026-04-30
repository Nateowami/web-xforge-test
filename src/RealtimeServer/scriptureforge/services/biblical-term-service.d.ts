import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { BiblicalTerm } from '../models/biblical-term';
import { SFProjectDataService } from './sf-project-data-service';
export declare class BiblicalTermService extends SFProjectDataService<BiblicalTerm> {
  readonly collection = 'biblical_terms';
  protected readonly indexPaths: (
    | string
    | {
        [x: string]: number;
      }
  )[];
  protected readonly listenForUpdates = true;
  readonly validationSchema: ValidationSchema;
  constructor();
  protected setupDomains(): ProjectDomainConfig[];
}

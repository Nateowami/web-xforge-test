import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { TrainingData } from '../models/training-data';
import { SFProjectDataService } from './sf-project-data-service';
/**
 * This class manages Serval training data docs.
 */
export declare class TrainingDataService extends SFProjectDataService<TrainingData> {
  readonly collection = 'training_data';
  protected readonly indexPaths: string[];
  readonly validationSchema: ValidationSchema;
  constructor();
  protected setupDomains(): ProjectDomainConfig[];
}

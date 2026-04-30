import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { TextAudio } from '../models/text-audio';
import { SFProjectDataService } from './sf-project-data-service';
/**
 * This class manages text audio timing docs.
 */
export declare class TextAudioService extends SFProjectDataService<TextAudio> {
  readonly collection = 'text_audio';
  protected readonly indexPaths: string[];
  readonly validationSchema: ValidationSchema;
  constructor();
  protected setupDomains(): ProjectDomainConfig[];
}

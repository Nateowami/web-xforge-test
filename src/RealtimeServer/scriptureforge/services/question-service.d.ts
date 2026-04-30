import { OwnedData } from '../../common/models/owned-data';
import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { Question } from '../models/question';
import { SFProjectDomain } from '../models/sf-project-rights';
import { SFProjectDataService } from './sf-project-data-service';
/**
 * This class manages question list docs.
 */
export declare class QuestionService extends SFProjectDataService<Question> {
  readonly collection = 'questions';
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
  protected onDelete(userId: string, docId: string, projectDomain: SFProjectDomain, entity: OwnedData): Promise<void>;
  private removeEntityReadRefs;
  private removeAnswerReadRefs;
  private removeCommentReadRefs;
}

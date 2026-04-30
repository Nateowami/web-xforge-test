import { OwnedData } from '../../common/models/owned-data';
import { ValidationSchema } from '../../common/models/validation-schema';
import { ProjectDomainConfig } from '../../common/services/project-data-service';
import { NoteThread } from '../models/note-thread';
import { SFProjectDataService } from './sf-project-data-service';
export declare class NoteThreadService extends SFProjectDataService<NoteThread> {
  readonly collection = 'note_threads';
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
  protected getApplicableDomains(entity?: OwnedData): ProjectDomainConfig[];
  protected onDelete(userId: string, docId: string, projectDomain: string, entity: OwnedData): Promise<void>;
  protected onBeforeDelete(userId: string, docId: string, projectDomain: string, entity: OwnedData): Promise<void>;
  private removeEntityHaveReadRefs;
  private removeNoteHaveReadRefs;
}

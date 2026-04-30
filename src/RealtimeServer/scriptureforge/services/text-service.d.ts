import { ConnectSession } from '../../common/connect-session';
import { ValidationSchema } from '../../common/models/validation-schema';
import { DocService } from '../../common/services/doc-service';
import { TextData } from '../models/text-data';
/**
 * This class manages text docs.
 */
export declare class TextService extends DocService<TextData> {
  readonly collection = 'texts';
  protected readonly indexPaths: string[];
  readonly validationSchema: ValidationSchema;
  constructor();
  allowCreate(docId: string, doc: TextData, session: ConnectSession): Promise<boolean>;
  allowRead(docId: string, doc: TextData, session: ConnectSession): Promise<boolean>;
  allowUpdate(
    docId: string,
    _oldDoc: TextData,
    _newDoc: TextData,
    _ops: any,
    session: ConnectSession
  ): Promise<boolean>;
  private hasRight;
  private getProject;
}

import { ConnectSession } from '../../common/connect-session';
import { ValidationSchema } from '../../common/models/validation-schema';
import { DocService } from '../../common/services/doc-service';
import { TextDocument } from '../models/text-document';
/**
 * This class manages USJ-based text docs.
 */
export declare class TextDocumentService extends DocService<TextDocument> {
  readonly collection = 'text_documents';
  protected readonly indexPaths: string[];
  readonly validationSchema: ValidationSchema;
  constructor();
  allowRead(docId: string, doc: TextDocument, session: ConnectSession): Promise<boolean>;
  allowUpdate(
    docId: string,
    _oldDoc: TextDocument,
    _newDoc: TextDocument,
    _ops: any,
    session: ConnectSession
  ): Promise<boolean>;
  private hasRight;
  private getProject;
}

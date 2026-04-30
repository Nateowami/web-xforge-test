import { ConnectSession } from '../connect-session';
import { Project } from '../models/project';
import { ValidationSchema } from '../models/validation-schema';
import { JsonDocService } from './json-doc-service';
/**
 * This class contains all common functionality for managing project docs.
 */
export declare abstract class ProjectService<T extends Project = Project> extends JsonDocService<T> {
  protected abstract get projectAdminRole(): string;
  protected readonly immutableProps: import('../utils/obj-path').ObjPathTemplate[];
  static readonly validationSchema: ValidationSchema;
  protected allowRead(_docId: string, doc: T, session: ConnectSession): boolean;
  protected allowUpdate(_docId: string, _oldDoc: T, newDoc: T, ops: any, session: ConnectSession): boolean;
}

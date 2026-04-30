import { ConnectSession } from '../connect-session';
import { User } from '../models/user';
import { ValidationSchema } from '../models/validation-schema';
import { RealtimeServer } from '../realtime-server';
import { ObjPathTemplate } from '../utils/obj-path';
import { JsonDocService } from './json-doc-service';
/**
 * This class manages user docs.
 */
export declare class UserService extends JsonDocService<User> {
  readonly collection = 'users';
  protected readonly indexPaths: string[];
  protected readonly immutableProps: ObjPathTemplate[];
  readonly validationSchema: ValidationSchema;
  constructor();
  init(server: RealtimeServer): void;
  protected allowRead(docId: string, doc: User, session: ConnectSession): boolean;
  protected allowUpdate(docId: string, _oldDoc: User, _newDoc: User, ops: any, session: ConnectSession): boolean;
}

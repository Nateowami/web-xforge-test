import ShareDB from 'sharedb';
import { ObjProxyArg } from 'ts-object-path';
import { OwnedData } from '../models/owned-data';
import { ObjPathTemplate } from '../utils/obj-path';
import { DocService } from './doc-service';
/**
 * This is the abstract base class for all doc services that manage JSON0 docs.
 */
export declare abstract class JsonDocService<T> extends DocService<T> {
  /**
   * The object paths to the immutable properties in the JSON0 doc.
   */
  protected readonly immutableProps: ObjPathTemplate[];
  protected pathTemplate<TField>(field?: ObjProxyArg<T, TField>, inherit?: boolean): ObjPathTemplate;
  protected checkImmutableProps(ops: ShareDB.Op[] | ShareDB.Op, entity?: OwnedData): boolean;
  protected getMatchingPathTemplate(pathTemplates: ObjPathTemplate[], path: ShareDB.Path, _entity?: OwnedData): number;
}

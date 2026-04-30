import ShareDB from 'sharedb';
import { ConnectSession } from '../connect-session';
import { MigrationConstructor } from '../migration';
import { OwnedData } from '../models/owned-data';
import { ProjectData } from '../models/project-data';
import { ProjectRights } from '../models/project-rights';
import { ValidationSchema } from '../models/validation-schema';
import { RealtimeServer } from '../realtime-server';
import { ObjPathTemplate } from '../utils/obj-path';
import { JsonDocService } from './json-doc-service';
/**
 * This interface represents the configuration for a project domain. A project domain defines the object path to an
 * entity type stored in a JSON0 doc.
 */
export interface ProjectDomainConfig {
  projectDomain: string;
  pathTemplate: ObjPathTemplate;
}
/**
 * This is the abstract base class for all doc services that manage JSON0 project data.
 */
export declare abstract class ProjectDataService<T extends ProjectData> extends JsonDocService<T> {
  protected readonly immutableProps: ObjPathTemplate[];
  protected abstract get projectRights(): ProjectRights;
  /**
   * Set this property to "true" in services that need to override "onInsert", "onUpdate", and "onDelete"
   */
  protected readonly listenForUpdates: boolean;
  private readonly domains;
  static readonly validationSchema: ValidationSchema;
  constructor(migrations: MigrationConstructor[]);
  init(server: RealtimeServer): void;
  protected allowCreate(_docId: string, doc: T, session: ConnectSession): Promise<boolean>;
  protected allowDelete(_docId: string, doc: T, session: ConnectSession): Promise<boolean>;
  protected allowRead(_docId: string, doc: T, session: ConnectSession): Promise<boolean>;
  protected allowUpdate(
    _docId: string,
    oldDoc: T,
    newDoc: T,
    ops: ShareDB.Op[],
    session: ConnectSession
  ): Promise<boolean>;
  /**
   * Creates the project domain configs for this service.
   *
   * @returns {ProjectDomainConfig[]} The project domain configs.
   */
  protected abstract setupDomains(): ProjectDomainConfig[];
  /**
   * Can be overriden to handle entity inserts. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the inserted entity.
   * @param {OwnedData} _entity The inserted entity.
   */
  protected onInsert(_userId: string, _docId: string, _projectDomain: string, _entity: OwnedData): Promise<void>;
  /**
   * Can be overriden to handle entity updates. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the updated entity.
   * @param {OwnedData} _entity The updated entity.
   */
  protected onUpdate(_userId: string, _docId: string, _projectDomain: string, _entity: OwnedData): Promise<void>;
  /**
   * Can be overriden to handle entity deletes. The "listenForUpdates" property must be set to "true" in order for this
   * method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the deleted entity.
   * @param {OwnedData} _entity The deleted entity.
   */
  protected onDelete(_userId: string, _docId: string, _projectDomain: string, _entity: OwnedData): Promise<void>;
  /**
   * Can be overriden to respond just before an entity is deleted. The "listenForUpdates" property must be set to
   * "true" in order for this method to get called.
   *
   * @param {string} _userId The user id.
   * @param {string} _docId The doc id.
   * @param {string} _projectDomain The project domain of the deleted entity.
   * @param {OwnedData} _entity The deleted entity.
   */
  protected onBeforeDelete(_userId: string, _docId: string, _projectDomain: string, _entity: OwnedData): Promise<void>;
  /**
   * Gets the applicable domains based on the properties in the entity.
   * @param _entity A noteThread or note.
   * @returns
   */
  protected getApplicableDomains(_entity?: OwnedData): ProjectDomainConfig[];
  private getUpdatedDomain;
  private hasRight;
  private deepGet;
  private handleApply;
  private handleAfterSubmit;
}

import { OwnedData } from './owned-data';
import { Project } from './project';
export declare enum Operation {
  Create = 'create',
  Edit = 'edit',
  Delete = 'delete',
  View = 'view',
  EditOwn = 'edit_own',
  DeleteOwn = 'delete_own',
  ViewOwn = 'view_own'
}
export type ProjectRight = [domain: string, operation: `${Operation}`];
/**
 * NOTE: When updating this class, be sure to update SFProjectRights in C#.
 */
export declare class ProjectRights {
  private readonly rights;
  constructor(rights?: { [role: string]: ProjectRight[] });
  hasRight(project: Project, userId: string, projectDomain: string, operation: Operation, data?: OwnedData): boolean;
  /**
   * Checks whether a project role has a right.
   * WARNING: Use hasRight instead in nearly every case. This method should only be used if the project document does not
   * yet exist, or if the user has not yet gained access to it.
   */
  roleHasRight(role: string, projectDomain: string, operation: Operation): boolean;
  joinRight(domain: string, operation: string): string;
  protected addRights(role: string, rights: ProjectRight[]): void;
}

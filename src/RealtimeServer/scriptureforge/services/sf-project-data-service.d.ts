import { ProjectData } from '../../common/models/project-data';
import { ProjectDataService } from '../../common/services/project-data-service';
/**
 * This is the abstract base class for all SF doc services that manage project data.
 */
export declare abstract class SFProjectDataService<T extends ProjectData> extends ProjectDataService<T> {
  protected readonly projectRights: import('../models/sf-project-rights').SFProjectRights;
}

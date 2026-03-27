import { Injectable } from '@angular/core';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { SFProjectProfileDoc } from '../../app/core/models/sf-project-profile-doc';
import { FeatureFlag, FeatureFlagService } from '../feature-flags/feature-flag.service';
import { SFUserProjectsService } from '../user-projects.service';
import { UserService } from '../user.service';

export interface ExperimentalFeature {
  name: string;
  description: string;
  available: () => boolean;
  featureFlag: FeatureFlag;
}

function isAdminOnProject(projectDoc: SFProjectProfileDoc, userId: string): boolean {
  return projectDoc.data?.userRoles[userId] === SFProjectRole.ParatextAdministrator;
}

@Injectable({ providedIn: 'root' })
export class ExperimentalFeaturesService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly userService: UserService,
    private readonly userProjectsService: SFUserProjectsService
  ) {}

  public experimentalFeatures: ExperimentalFeature[] = [
    {
      name: 'New configure sources page',
      description: `A new configure sources page is available for testing. It has the same functionality as the current page, but with an updated design and some additional information to help users understand the options.`,
      available: () =>
        (this.userProjectsService.projectDocs ?? []).some(projectDoc =>
          isAdminOnProject(projectDoc, this.userService.currentUserId)
        ),
      featureFlag: this.featureFlagService.newConfigureSourcesPage
    }
  ];

  public get availableExperimentalFeatures(): ExperimentalFeature[] {
    return this.experimentalFeatures.filter(feature => feature.available());
  }

  public get showExperimentalFeaturesInMenu(): boolean {
    return this.availableExperimentalFeatures.length > 0;
  }
}

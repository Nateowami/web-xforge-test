import { Component, OnInit } from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MobileNotSupportedComponent } from '../shared/mobile-not-supported/mobile-not-supported.component';
import { DraftJobsComponent } from './draft-jobs.component';
import { OnboardingRequestsComponent } from './onboarding-requests/onboarding-requests.component';
import { ServalBuildsComponent } from './serval-builds.component';
import { ServalProjectsComponent } from './serval-projects.component';

/**
 * Main serval administration component with tabbed interface.
 * Supports URL parameters for filtering by project ID and selecting specific tabs.
 */
@Component({
  selector: 'app-serval-administration',
  templateUrl: './serval-administration.component.html',
  styleUrls: ['./serval-administration.component.scss'],
  imports: [
    ServalProjectsComponent,
    MobileNotSupportedComponent,
    DraftJobsComponent,
    OnboardingRequestsComponent,
    ServalBuildsComponent,
    MatTabGroup,
    MatTab,
    MatTabContent
  ]
})
export class ServalAdministrationComponent implements OnInit {
  selectedTabIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  private readonly availableTabs = ['projects', 'draft-jobs', 'serval-builds', 'onboarding-requests'];

  /** Query params that only mean something on one tab, and so are dropped when leaving that tab. */
  private readonly tabScopedQueryParams: { [tab: string]: string[] } = {
    'draft-jobs': ['projectId'],
    'serval-builds': ['q']
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      this.selectedTabIndex = this.availableTabs.includes(tab) ? this.availableTabs.indexOf(tab) : 0;
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    const tab = this.availableTabs[index];

    // A filter belonging to another tab would linger in the URL and be silently reapplied on
    // returning to that tab, so clear it.
    const queryParams: Params = { tab };
    for (const [scopedTab, params] of Object.entries(this.tabScopedQueryParams)) {
      if (scopedTab === tab) continue;
      for (const param of params) {
        queryParams[param] = null;
      }
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
}

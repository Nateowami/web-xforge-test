import { Directive } from '@angular/core';
import { DataLoadingComponent } from 'xforge-common/data-loading-component';
import { NoticeService } from 'xforge-common/notice.service';
import { UserService } from 'xforge-common/user.service';
import {
  DRAFT_REQUEST_RESOLUTION_OPTIONS,
  OnboardingRequestService
} from '../translate/draft-generation/onboarding-request.service';

/**
 * Abstract base component that provides shared logic for components displaying onboarding requests.
 * Provides resolution options and comparison, and the current user ID for use in templates and sub-components.
 */
// Decorator required by Angular compiler for abstract directive/component base classes
@Directive()
export abstract class OnboardingRequestBaseComponent extends DataLoadingComponent {
  currentUserId?: string;
  readonly resolutionOptions = DRAFT_REQUEST_RESOLUTION_OPTIONS;
  readonly getStatus = this.onboardingRequestService.getStatus;

  constructor(
    protected readonly userService: UserService,
    protected readonly onboardingRequestService: OnboardingRequestService,
    noticeService: NoticeService
  ) {
    super(noticeService);
  }

  /**
   * Comparison function for resolution values in select dropdowns.
   * Needed to properly handle null values when the resolution has not yet been set on a request.
   */
  compareResolutions(r1: string | null, r2: string | null): boolean {
    return r1 === r2 || (r1 == null && r2 == null);
  }
}

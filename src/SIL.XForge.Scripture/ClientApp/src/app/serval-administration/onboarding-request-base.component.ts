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
 * Handles user display name caching, assignee option building, and resolution value comparisons.
 */
// Decorator required by Angular compiler for abstract directive/component base classes
@Directive()
export abstract class OnboardingRequestBaseComponent extends DataLoadingComponent {
  currentUserId?: string;
  assignedUserIds: Set<string> = new Set();
  userDisplayNames: Map<string, string> = new Map();
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

  /**
   * Gets the list of user IDs to show in the assignee dropdown (excluding "Unassigned").
   * Puts the current user first, then any other users already in assignedUserIds.
   */
  getAssignedUserOptions(): string[] {
    const options: string[] = [];

    // Add current user first if available
    if (this.currentUserId != null) {
      options.push(this.currentUserId);
    }

    // Add all other known assigned users
    this.assignedUserIds.forEach(userId => {
      if (userId !== this.currentUserId && !options.includes(userId)) {
        options.push(userId);
      }
    });

    return options;
  }

  /** Fetches and caches the display name for a user ID. No-ops if the name is already cached. */
  protected async cacheUserDisplayName(userId: string): Promise<void> {
    if (!this.userDisplayNames.has(userId)) {
      const userDoc = await this.userService.getProfile(userId);
      if (userDoc?.data != null) {
        const displayName = this.currentUserId === userId ? 'Me' : userDoc.data.displayName || 'Unknown User';
        this.userDisplayNames.set(userId, displayName);
      } else {
        this.userDisplayNames.set(userId, 'Unknown User');
      }
    }
  }

  /** Returns the cached display name for a user ID, or 'Loading...' if not yet loaded. */
  getUserDisplayName(userId: string): string {
    return this.userDisplayNames.get(userId) ?? 'Loading...';
  }
}

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanDeactivate, RedirectCommand, Router, RouterStateSnapshot } from '@angular/router';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthGuard } from 'xforge-common/auth.guard';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { PermissionsService } from '../core/permissions.service';
import { SFProjectService } from '../core/sf-project.service';

export abstract class RouterGuard {
  constructor(
    protected readonly authGuard: AuthGuard,
    protected readonly projectService: SFProjectService,
    protected readonly permissionsService: PermissionsService,
    protected readonly router: Router
  ) {}

  /**
   * Redirects instead of only refusing, because refusing the first navigation of the app (a pasted or bookmarked URL)
   * leaves a blank page. Users who cannot read the project go to My projects, and users who are on the project but may
   * not open this page go to the project, which forwards them to a page they can use.
   */
  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | RedirectCommand> {
    const projectId = 'projectId' in next.params ? next.params['projectId'] : '';
    return this.authGuard
      .canActivate(next, state)
      .pipe(switchMap(isLoggedIn => (isLoggedIn ? from(this.checkProject(projectId)) : of(false))));
  }

  allowTransition(projectId: string): Observable<boolean> {
    return this.authGuard.allowTransition().pipe(
      switchMap(isLoggedIn => {
        if (isLoggedIn) {
          return from(this.getReadableProfile(projectId)).pipe(
            map(projectDoc => projectDoc != null && this.check(projectDoc))
          );
        }
        return of(false);
      })
    );
  }

  abstract check(project: SFProjectProfileDoc): boolean;

  private async checkProject(projectId: string): Promise<boolean | RedirectCommand> {
    const projectDoc: SFProjectProfileDoc | undefined = await this.getReadableProfile(projectId);
    if (projectDoc?.data == null) {
      return this.redirectTo(['/projects']);
    }
    return this.check(projectDoc) || this.redirectTo(['/projects', projectId]);
  }

  /** Replaces the refused URL in the history, so that going back does not return to it. */
  private redirectTo(commands: string[]): RedirectCommand {
    return new RedirectCommand(this.router.createUrlTree(commands), { replaceUrl: true });
  }

  /**
   * Gets the project profile, or undefined if the realtime server would deny reading it. Subscribing to a project the
   * user cannot read fails with a permission error that is shown to the user, so it is not attempted.
   */
  private async getReadableProfile(projectId: string): Promise<SFProjectProfileDoc | undefined> {
    const canRead: boolean =
      this.permissionsService.isServalAdmin ||
      this.permissionsService.isSystemAdmin ||
      (await this.permissionsService.isUserOnProject(projectId));
    return canRead ? await this.projectService.getProfile(projectId) : undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissionsService.canAccessProjectSettings(projectDoc);
  }
}

@Injectable({
  providedIn: 'root'
})
export class UsersAuthGuard extends SettingsAuthGuard {}

@Injectable({
  providedIn: 'root'
})
export class SyncAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissionsService.canAccessSync(projectDoc);
  }
}

@Injectable({
  providedIn: 'root'
})
export class NmtDraftAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router,
    private userService: UserService
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    if (projectDoc.data == null) {
      return false;
    }

    return SF_PROJECT_RIGHTS.hasRight(
      projectDoc.data,
      this.userService.currentUserId,
      SFProjectDomain.Texts,
      Operation.Edit
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class CheckingAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissionsService.canAccessCommunityChecking(projectDoc);
  }
}

@Injectable({
  providedIn: 'root'
})
export class TranslateAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissionsService.canAccessTranslate(projectDoc);
  }
}

export interface ConfirmOnLeave {
  confirmLeave(): Promise<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class DraftNavigationAuthGuard extends RouterGuard implements CanDeactivate<ConfirmOnLeave> {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    permissionsService: PermissionsService,
    router: Router
  ) {
    super(authGuard, projectService, permissionsService, router);
  }

  async canDeactivate(component: ConfirmOnLeave): Promise<boolean> {
    return await component.confirmLeave();
  }

  check(_: SFProjectProfileDoc): boolean {
    return true;
  }
}

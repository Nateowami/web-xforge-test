import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanDeactivate, Router, RouterStateSnapshot } from '@angular/router';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { isResource } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthGuard } from 'xforge-common/auth.guard';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { I18nKey } from 'xforge-common/i18n.service';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { PermissionsService } from '../core/permissions.service';
import { SFProjectService } from '../core/sf-project.service';

export abstract class RouterGuard {
  protected readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  protected readonly permissions = inject(PermissionsService);

  constructor(
    protected readonly authGuard: AuthGuard,
    protected readonly projectService: SFProjectService
  ) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const projectId = 'projectId' in next.params ? next.params['projectId'] : '';
    return this.authGuard.canActivate(next, state).pipe(switchMap(() => this.allowTransition(projectId)));
  }

  allowTransition(projectId: string): Observable<boolean> {
    return this.authGuard.allowTransition().pipe(
      switchMap(isLoggedIn => {
        if (isLoggedIn) {
          return from(this.projectService.getProfile(projectId)).pipe(
            // A project that does not exist has no data, so there is nothing to show the user
            map(projectDoc =>
              projectDoc.data == null ? this.projectUnavailable('app.project_has_been_deleted') : this.check(projectDoc)
            ),
            // The project cannot be read if the user is not a member of it. Tell the user instead of leaving them on a
            // blank page, but let any other error be reported as usual.
            catchError(error =>
              from(this.permissions.isUserOnProject(projectId)).pipe(
                map(isUserOnProject => {
                  if (isUserOnProject) {
                    throw error;
                  }
                  return this.projectUnavailable('app.not_a_project_member');
                })
              )
            )
          );
        }
        return of(false);
      })
    );
  }

  abstract check(project: SFProjectProfileDoc): boolean;

  /** Sends the user to their project list and tells them why they cannot see the project they requested. */
  private projectUnavailable(message: I18nKey): boolean {
    void this.router.navigateByUrl('/projects', { replaceUrl: true });
    void this.dialogService.message(message);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private userService: UserService
  ) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return (
      projectDoc.data != null &&
      projectDoc.data.userRoles[this.userService.currentUserId] === SFProjectRole.ParatextAdministrator
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class UsersAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private userService: UserService
  ) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return (
      projectDoc.data != null &&
      projectDoc.data.userRoles[this.userService.currentUserId] === SFProjectRole.ParatextAdministrator
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class SyncAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    if (projectDoc.data == null) return false;
    return (
      SF_PROJECT_RIGHTS.hasRight(
        projectDoc.data,
        this.userService.currentUserId,
        SFProjectDomain.Texts,
        Operation.Edit
      ) ||
      (this.authService.currentUserRoles.includes(SystemRole.ServalAdmin) &&
        isResource(projectDoc.data) &&
        SF_PROJECT_RIGHTS.hasRight(
          projectDoc.data,
          this.userService.currentUserId,
          SFProjectDomain.Texts,
          Operation.View
        ))
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class NmtDraftAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private userService: UserService
  ) {
    super(authGuard, projectService);
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
  constructor(authGuard: AuthGuard, projectService: SFProjectService) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    if (this.permissions.canAccessCommunityChecking(projectDoc)) {
      return true;
    }
    void this.router.navigate(['/projects', projectDoc.id], { replaceUrl: true });
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TranslateAuthGuard extends RouterGuard {
  constructor(authGuard: AuthGuard, projectService: SFProjectService) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    if (this.permissions.canAccessTranslate(projectDoc)) {
      return true;
    }
    void this.router.navigate(['/projects', projectDoc.id], { replaceUrl: true });
    return false;
  }
}

/**
 * Guards the project route. The project component only redirects users to the task they should see, so without this
 * guard a user who cannot see the project (e.g. they are not a member of it) is left on a blank page.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectAuthGuard extends RouterGuard {
  constructor(authGuard: AuthGuard, projectService: SFProjectService) {
    super(authGuard, projectService);
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Old style sharing links are opened by users who are not yet members of the project. The project component
    // redirects them to the join page, so the project itself must not be checked.
    if (next.queryParams['sharing'] === 'true') {
      return this.authGuard.canActivate(next, state);
    }
    return super.canActivate(next, state);
  }

  check(_projectDoc: SFProjectProfileDoc): boolean {
    return true;
  }
}

export interface ConfirmOnLeave {
  confirmLeave(): Promise<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class DraftNavigationAuthGuard extends RouterGuard implements CanDeactivate<ConfirmOnLeave> {
  constructor(authGuard: AuthGuard, projectService: SFProjectService) {
    super(authGuard, projectService);
  }

  async canDeactivate(component: ConfirmOnLeave): Promise<boolean> {
    return await component.confirmLeave();
  }

  check(_: SFProjectProfileDoc): boolean {
    return true;
  }
}

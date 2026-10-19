import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanDeactivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
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
  private readonly router = inject(Router);

  constructor(
    protected readonly authGuard: AuthGuard,
    protected readonly projectService: SFProjectService
  ) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const projectId = 'projectId' in next.params ? next.params['projectId'] : '';
    return this.authGuard.canActivate(next, state).pipe(
      switchMap(isLoggedIn => {
        if (!isLoggedIn) {
          // AuthGuard has already started the login redirect
          return of(false);
        }
        // Send users without access to the project's home page rather than leave them on a blank page.
        // A plain UrlTree, not RedirectCommand with replaceUrl: the router already replaces the history entry of
        // a URL typed in the address bar, and forcing it would drop the page the user came from on in-app links.
        return this.allowTransition(projectId).pipe(
          map(allowed => allowed || this.router.createUrlTree(['/projects', projectId]))
        );
      })
    );
  }

  allowTransition(projectId: string): Observable<boolean> {
    return this.authGuard.allowTransition().pipe(
      switchMap(isLoggedIn => {
        if (isLoggedIn) {
          return from(this.projectService.getProfile(projectId)).pipe(map(projectDoc => this.check(projectDoc)));
        }
        return of(false);
      })
    );
  }

  abstract check(project: SFProjectProfileDoc): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private readonly permissionsService: PermissionsService
  ) {
    super(authGuard, projectService);
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
    private readonly permissionsService: PermissionsService
  ) {
    super(authGuard, projectService);
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
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private readonly permissions: PermissionsService
  ) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissions.canAccessCommunityChecking(projectDoc);
  }
}

@Injectable({
  providedIn: 'root'
})
export class TranslateAuthGuard extends RouterGuard {
  constructor(
    authGuard: AuthGuard,
    projectService: SFProjectService,
    private readonly permissions: PermissionsService
  ) {
    super(authGuard, projectService);
  }

  check(projectDoc: SFProjectProfileDoc): boolean {
    return this.permissions.canAccessTranslate(projectDoc);
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

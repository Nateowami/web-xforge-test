import { Component, DestroyRef, HostBinding, OnInit } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialogConfig } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator } from '@angular/material/paginator';
import { MatCell, MatCellDef, MatColumnDef, MatRow, MatRowDef, MatTable } from '@angular/material/table';
import { escapeRegExp } from 'lodash-es';
import { Project } from 'realtime-server/lib/esm/common/models/project';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { obj } from 'realtime-server/lib/esm/common/utils/obj-path';
import { BehaviorSubject } from 'rxjs';
import { RealtimeQuery } from 'xforge-common/models/realtime-query';
import { UserDoc } from 'xforge-common/models/user-doc';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { environment } from '../../environments/environment';
import { AdvancedSearchComponent } from '../../app/shared/advanced-search/advanced-search.component';
import { ParsedSearchQuery, SearchFieldsDef } from '../../app/shared/advanced-search/search-query-parser';
import { AvatarComponent } from '../avatar/avatar.component';
import { DataLoadingComponent } from '../data-loading-component';
import { DialogService } from '../dialog.service';
import { ProjectDoc } from '../models/project-doc';
import { NoticeService } from '../notice.service';
import { ProjectService } from '../project.service';
import { QueryFilter, QueryParameters } from '../query-parameters';
import { RouterLinkDirective } from '../router-link.directive';
import { UserService } from '../user.service';
import { SaDeleteDialogComponent, SaDeleteUserDialogData } from './sa-delete-dialog.component';

interface ProjectInfo {
  id: string;
  name: string;
}

interface Row {
  readonly id: string;
  readonly user: User;
  readonly projects: ProjectInfo[];
}

@Component({
  selector: 'app-sa-users',
  templateUrl: './sa-users.component.html',
  styleUrls: ['./sa-users.component.scss'],
  imports: [
    AdvancedSearchComponent,
    MatTable,
    MatColumnDef,
    MatCellDef,
    MatCell,
    AvatarComponent,
    RouterLinkDirective,
    MatIconButton,
    MatIcon,
    MatRowDef,
    MatRow,
    MatPaginator
  ]
})
export class SaUsersComponent extends DataLoadingComponent implements OnInit {
  @HostBinding('class') classes = 'flex-column';

  totalRecordCount: number = 0;
  pageIndex: number = 0;
  pageSize: number = 50;

  userRows: Row[] = [];

  /** Fields available for the advanced search box. */
  readonly searchFieldsDef: SearchFieldsDef = {
    fields: [
      { id: 'displayName', label: 'Display name', type: 'text' },
      { id: 'name', label: 'Full name', type: 'text' },
      { id: 'email', label: 'Email address', type: 'text' }
    ]
  };

  /** The last valid search query emitted by the advanced search component. */
  private searchQuery: ParsedSearchQuery = { terms: [], isValid: true, errors: [] };

  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly queryParameters$ = new BehaviorSubject<QueryParameters>(this.getQueryParameters());
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  constructor(
    private dialogService: DialogService,
    noticeService: NoticeService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private destroyRef: DestroyRef
  ) {
    super(noticeService, 'SaUsersComponent');
  }

  get currentUserId(): string {
    return this.userService.currentUserId;
  }

  ngOnInit(): void {
    this.loadingStarted();
    this.userService
      .onlineQuery(this.searchTerm$, this.queryParameters$, this.reload$)
      .pipe(quietTakeUntilDestroyed(this.destroyRef))
      .subscribe(async searchResults => {
        // Process the query for users into Rows that can be displayed.
        this.loadingStarted();
        const projectDocs = await this.getUserProjectDocs(searchResults);
        const userRows: Row[] = [];
        for (const userDoc of searchResults.docs) {
          if (userDoc.data == null) {
            continue;
          }

          const projects: ProjectInfo[] = [];
          for (const projectId of userDoc.data.sites[environment.siteId].projects) {
            const projectDoc = projectDocs.get(projectId);
            if (projectDoc != null && projectDoc.data != null) {
              projects.push({ id: projectDoc.id, name: projectDoc.data.name });
            }
          }
          userRows.push({
            id: userDoc.id,
            user: userDoc.data,
            projects
          });
        }
        this.userRows = userRows;
        this.totalRecordCount = searchResults.unpagedCount;

        // We have moved beyond the last user (i.e. because of deletion), move to the previous page
        if (this.pageIndex * this.pageSize >= Math.max(this.totalRecordCount, this.pageSize)) {
          this.updatePage(this.pageIndex - 1, this.pageSize);
        }

        this.loadingFinished();
      });
  }

  /** Called when the advanced search emits a new query; rebuilds the realtime query parameters. */
  onSearch(query: ParsedSearchQuery): void {
    this.pageIndex = 0;
    this.searchQuery = query;
    this.queryParameters$.next(this.getQueryParameters());
  }

  updatePage(pageIndex: number, pageSize: number): void {
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.queryParameters$.next(this.getQueryParameters());
  }

  removeUser(userId: string, user: User): void {
    const dialogConfig: MatDialogConfig<SaDeleteUserDialogData> = {
      data: {
        user
      }
    };

    this.dialogService
      .openMatDialog(SaDeleteDialogComponent, dialogConfig)
      .afterClosed()
      .subscribe(confirmation => {
        if (confirmation) {
          void this.deleteUser(userId);
        }
      });
  }

  /** Get project docs for each project associated with each user, keyed by project id. */
  private async getUserProjectDocs(userDocs: RealtimeQuery<UserDoc>): Promise<Map<string, ProjectDoc<Project>>> {
    const projectDocsLookup = [] as string[];
    for (const userDoc of userDocs.docs) {
      if (userDoc.data != null) {
        for (const projectId of userDoc.data.sites[environment.siteId].projects) {
          projectDocsLookup.push(projectId);
        }
      }
    }

    const projectDocs = await this.projectService.onlineGetMany(projectDocsLookup);
    const projectIdMap = new Map<string, ProjectDoc>();
    for (const projectDoc of projectDocs) {
      projectIdMap.set(projectDoc.id, projectDoc);
    }
    return projectIdMap;
  }

  private async deleteUser(userId: string): Promise<void> {
    await this.userService.onlineDelete(userId);
    this.reload$.next(undefined);
  }

  private getQueryParameters(): QueryParameters {
    const params: QueryParameters = {
      $sort: { [obj<User>().pathStr(u => u.name)]: 1 },
      $skip: this.pageIndex * this.pageSize,
      $limit: this.pageSize
    };

    if (this.searchQuery.isValid && this.searchQuery.terms.length > 0) {
      const termFilters: QueryFilter[] = [];
      for (const term of this.searchQuery.terms) {
        const textValue = escapeRegExp(term.value as string);
        switch (term.fieldId) {
          case 'displayName':
            termFilters.push({ [obj<User>().pathStr(u => u.displayName)]: { $regex: `.*${textValue}.*`, $options: 'i' } });
            break;
          case 'name':
            termFilters.push({ [obj<User>().pathStr(u => u.name)]: { $regex: `.*${textValue}.*`, $options: 'i' } });
            break;
          case 'email':
            termFilters.push({ [obj<User>().pathStr(u => u.email)]: { $regex: `.*${textValue}.*`, $options: 'i' } });
            break;
        }
      }
      if (termFilters.length === 1) {
        Object.assign(params, termFilters[0]);
      } else if (termFilters.length > 1) {
        params.$and = termFilters;
      }
    }

    return params;
  }
}

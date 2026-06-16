import { Component, DestroyRef, OnInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator } from '@angular/material/paginator';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import { Router } from '@angular/router';
import { escapeRegExp } from 'lodash-es';
import { Project } from 'realtime-server/lib/esm/common/models/project';
import { obj } from 'realtime-server/lib/esm/common/utils/obj-path';
import { SFProject, SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { TranslateSource } from 'realtime-server/lib/esm/scriptureforge/models/translate-config';
import { BehaviorSubject } from 'rxjs';
import { DataLoadingComponent } from 'xforge-common/data-loading-component';
import { I18nService } from 'xforge-common/i18n.service';
import { NoticeService } from 'xforge-common/notice.service';
import { QueryFilter, QueryParameters } from 'xforge-common/query-parameters';
import { RouterLinkDirective } from 'xforge-common/router-link.directive';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { AdvancedSearchComponent } from '../shared/advanced-search/advanced-search.component';
import { ParsedSearchQuery, SearchFieldsDef } from '../shared/advanced-search/search-query-parser';
import { SFProjectProfileDoc } from '../core/models/sf-project-profile-doc';
import { projectLabel } from '../shared/utils';
import { DraftSourcesAsTranslateSourceArrays, projectToDraftSources } from '../translate/draft-generation/draft-utils';
import { ServalAdministrationService } from './serval-administration.service';
interface SourceData {
  id: string;
  label: string;
}

class Row {
  private draftSources: DraftSourcesAsTranslateSourceArrays | undefined;

  constructor(public readonly projectDoc: SFProjectProfileDoc) {
    this.draftSources = projectDoc.data == null ? undefined : projectToDraftSources(projectDoc.data);
  }

  get draftingSources(): SourceData[] {
    return this.draftSources == null ? [] : this.draftSources.draftingSources.map(s => Row.sourceAsSourceData(s));
  }

  get trainingSources(): SourceData[] {
    return this.draftSources == null ? [] : this.draftSources.trainingSources.map(s => Row.sourceAsSourceData(s));
  }

  get id(): string {
    return this.projectDoc.id;
  }

  get name(): string {
    return this.projectDoc.data == null ? 'N/A' : projectLabel(this.projectDoc.data);
  }

  get preTranslate(): boolean {
    return this.projectDoc.data?.translateConfig.preTranslate ?? false;
  }

  get source(): string {
    const source = this.projectDoc.data?.translateConfig.source;
    return source == null ? 'None' : projectLabel(source);
  }

  get sourceId(): string | undefined {
    return this.projectDoc.data?.translateConfig.source?.projectRef;
  }

  static sourceAsSourceData(source: TranslateSource): SourceData {
    return { id: source.projectRef, label: projectLabel(source) };
  }
}

@Component({
  selector: 'app-serval-projects',
  templateUrl: './serval-projects.component.html',
  styleUrls: ['./serval-projects.component.scss'],
  imports: [
    AdvancedSearchComponent,
    MatButton,
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatRow,
    MatRowDef,
    MatPaginator,
    RouterLinkDirective
  ]
})
export class ServalProjectsComponent extends DataLoadingComponent implements OnInit {
  columnsToDisplay: string[] = ['name', 'preTranslate', 'source', 'draftingSource', 'trainingSource', 'actions'];
  rows: Row[] = [];

  length: number = 0;
  pageIndex: number = 0;
  pageSize: number = 50;

  /** Fields available for the advanced search box. */
  readonly searchFieldsDef: SearchFieldsDef = {
    fields: [
      { id: 'name', label: 'Project name', type: 'text' },
      { id: 'shortName', label: 'Project short name', type: 'text' },
      { id: 'drafting', label: 'Generating drafts enabled', type: 'boolean' },
      {
        id: 'customConfig',
        label: 'Has custom Serval configuration',
        type: 'boolean',
        description: 'Filter for projects that have a custom Serval configuration JSON override.'
      }
    ]
  };

  /** The last valid search query emitted by the advanced search component. */
  private searchQuery: ParsedSearchQuery = { terms: [], isValid: true, errors: [] };

  private projectDocs?: Readonly<SFProjectProfileDoc[]>;

  private readonly searchTerm$: BehaviorSubject<string>;
  private readonly queryParameters$: BehaviorSubject<QueryParameters>;

  constructor(
    noticeService: NoticeService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly servalAdministrationService: ServalAdministrationService,
    private destroyRef: DestroyRef
  ) {
    super(noticeService, 'ServalProjectsComponent');
    this.searchTerm$ = new BehaviorSubject<string>('');
    this.queryParameters$ = new BehaviorSubject<QueryParameters>(this.getQueryParameters());
  }

  get isLoading(): boolean {
    return this.projectDocs == null;
  }

  ngOnInit(): void {
    this.loadingStarted();
    this.servalAdministrationService
      .onlineQuery(this.searchTerm$, this.queryParameters$, [
        obj<Project>().pathStr(p => p.name),
        obj<SFProjectProfile>().pathStr(p => p.shortName)
      ])
      .pipe(quietTakeUntilDestroyed(this.destroyRef))
      .subscribe(searchResults => {
        this.projectDocs = searchResults.docs;
        this.length = searchResults.unpagedCount;
        this.generateRows();
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

  viewDraftJobs(projectId: string): void {
    void this.router.navigate(['/serval-administration'], {
      queryParams: {
        projectId,
        tab: 'draft-jobs'
      }
    });
  }

  private generateRows(): void {
    if (this.projectDocs == null) {
      return;
    }

    const rows: Row[] = [];
    for (const projectDoc of this.projectDocs) {
      rows.push(new Row(projectDoc));
    }
    this.rows = rows;
  }

  private getQueryParameters(): QueryParameters {
    const params: QueryParameters = {
      // Do not return resources
      [obj<SFProject>().pathStr(q => q.resourceConfig)]: null,
      $sort: { [obj<Project>().pathStr(p => p.name)]: 1 },
      $skip: this.pageIndex * this.pageSize,
      $limit: this.pageSize
    };

    if (this.searchQuery.isValid && this.searchQuery.terms.length > 0) {
      const termFilters: QueryFilter[] = [];
      for (const term of this.searchQuery.terms) {
        switch (term.fieldId) {
          case 'name':
            termFilters.push({
              [obj<Project>().pathStr(p => p.name)]: { $regex: `.*${escapeRegExp(term.value as string)}.*`, $options: 'i' }
            });
            break;
          case 'shortName':
            termFilters.push({
              [obj<SFProjectProfile>().pathStr(p => p.shortName)]: { $regex: `.*${escapeRegExp(term.value as string)}.*`, $options: 'i' }
            });
            break;
          case 'drafting':
            termFilters.push({ [obj<SFProject>().pathStr(q => q.translateConfig.preTranslate)]: term.value });
            break;
          case 'customConfig':
            // true = has custom config (field is not null); false = no custom config (field is null)
            termFilters.push({
              [obj<SFProject>().pathStr(q => q.translateConfig.draftConfig?.servalConfig)]:
                term.value === true ? { $ne: null } : null
            });
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

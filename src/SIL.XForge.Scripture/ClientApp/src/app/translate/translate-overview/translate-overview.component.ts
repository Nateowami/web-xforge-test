import { Component, DestroyRef, OnInit } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle
} from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { Canon } from '@sillsdev/scripture';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { ANY_INDEX, obj } from 'realtime-server/lib/esm/common/utils/obj-path';
import { SFProject } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { isParatextRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { asyncScheduler, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, throttleTime } from 'rxjs/operators';
import { DataLoadingComponent } from 'xforge-common/data-loading-component';
import { DonutChartComponent } from 'xforge-common/donut-chart/donut-chart.component';
import { I18nService } from 'xforge-common/i18n.service';
import { L10nNumberPipe } from 'xforge-common/l10n-number.pipe';
import { L10nPercentPipe } from 'xforge-common/l10n-percent.pipe';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { RouterLinkDirective } from 'xforge-common/router-link.directive';
import { UserService } from 'xforge-common/user.service';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { SFProjectService } from '../../core/sf-project.service';
import { BookProgress, ProgressService, ProjectProgress } from '../../shared/progress-service/progress.service';
import { FontUnsupportedMessageComponent } from '../font-unsupported-message/font-unsupported-message.component';
const TEXT_PATH_TEMPLATE = obj<SFProject>().pathTemplate(p => p.texts[ANY_INDEX]);

@Component({
  selector: 'app-translate-overview',
  templateUrl: './translate-overview.component.html',
  styleUrls: ['./translate-overview.component.scss'],
  imports: [
    TranslocoModule,
    FontUnsupportedMessageComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatTooltip,
    DonutChartComponent,
    MatDivider,
    MatList,
    MatListItem,
    RouterLinkDirective,
    MatIcon,
    MatListItemIcon,
    MatListItemTitle,
    MatListItemLine,
    MatListItemMeta,
    L10nNumberPipe,
    L10nPercentPipe
  ]
})
export class TranslateOverviewComponent extends DataLoadingComponent implements OnInit {
  projectProgress?: ProjectProgress;
  private projectDoc?: SFProjectProfileDoc;
  private projectDataChangesSub?: Subscription;
  private onlineStatusSub?: Subscription;
  private progressRequestCount = 0;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly onlineStatusService: OnlineStatusService,
    noticeService: NoticeService,
    private readonly projectService: SFProjectService,
    private readonly userService: UserService,
    public readonly progressService: ProgressService,
    readonly i18n: I18nService,
    private destroyRef: DestroyRef
  ) {
    super(noticeService, 'TranslateOverviewComponent');
  }

  get canEditTexts(): boolean {
    const project = this.projectDoc?.data;
    return (
      project != null &&
      SF_PROJECT_RIGHTS.hasRight(project, this.userService.currentUserId, SFProjectDomain.Texts, Operation.Edit)
    );
  }

  get projectId(): string | undefined {
    return this.projectDoc?.id;
  }

  get isPTUser(): boolean {
    return isParatextRole(this.projectDoc?.data?.userRoles[this.userService.currentUserId]);
  }

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(
        map(params => params['projectId']),
        quietTakeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async projectId => {
        this.projectDoc = await this.projectService.getProfile(projectId);

        // Progress is calculated from local data while offline, so recalculate whenever the online status changes
        this.onlineStatusSub?.unsubscribe();
        this.onlineStatusSub = this.onlineStatusService.onlineStatus$
          .pipe(distinctUntilChanged(), quietTakeUntilDestroyed(this.destroyRef))
          .subscribe(() => void this.updateProgress());

        if (this.projectDataChangesSub != null) {
          this.projectDataChangesSub.unsubscribe();
        }
        this.projectDataChangesSub = this.projectDoc.remoteChanges$
          .pipe(
            filter(ops => ops.some(op => TEXT_PATH_TEMPLATE.matches(op.p))),
            // TODO Find a better solution than merely throttling remote changes
            throttleTime(1000, asyncScheduler, { leading: true, trailing: true })
          )
          .subscribe(() => void this.updateProgress());
      });
  }

  getBookNameFromId(bookId: string): string {
    const bookNum = Canon.bookIdToNumber(bookId);
    return this.i18n.localizeBook(bookNum);
  }

  private async updateProgress(): Promise<void> {
    // Online and offline results can resolve out of order, so only the latest request may set the progress
    const requestNumber = ++this.progressRequestCount;
    this.loadingStarted();
    try {
      const progress = await this.progressService.getProgress(this.projectId!, { maxStalenessMs: 30_000 });
      if (requestNumber === this.progressRequestCount) this.projectProgress = progress;
    } finally {
      this.loadingFinished();
    }
  }

  bookTranslatedSegments(bookProgress: BookProgress): number {
    return bookProgress.verseSegments - bookProgress.blankVerseSegments;
  }

  bookTranslationRatio(bookProgress: BookProgress): number {
    if (bookProgress.verseSegments === 0) {
      return 0;
    }
    return this.bookTranslatedSegments(bookProgress) / bookProgress.verseSegments;
  }
}

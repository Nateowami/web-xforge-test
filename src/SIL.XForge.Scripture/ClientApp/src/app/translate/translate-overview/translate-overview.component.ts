import { Component, DestroyRef, ErrorHandler, OnInit } from '@angular/core';
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
import { asyncScheduler, EMPTY, from, merge, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, throttleTime } from 'rxjs/operators';
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
import { NoticeComponent } from '../../shared/notice/notice.component';
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
    NoticeComponent,
    L10nNumberPipe,
    L10nPercentPipe
  ]
})
export class TranslateOverviewComponent extends DataLoadingComponent implements OnInit {
  projectProgress?: ProjectProgress;
  /** Whether {@link projectProgress} was calculated offline and is missing chapters that are not stored on this device. */
  progressIsPartial = false;
  private projectDoc?: SFProjectProfileDoc;
  private projectDataChangesSub?: Subscription;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly onlineStatusService: OnlineStatusService,
    noticeService: NoticeService,
    private readonly projectService: SFProjectService,
    private readonly userService: UserService,
    public readonly progressService: ProgressService,
    readonly i18n: I18nService,
    private destroyRef: DestroyRef,
    private readonly errorHandler: ErrorHandler
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

        if (this.projectDataChangesSub != null) {
          this.projectDataChangesSub.unsubscribe();
        }
        // Progress is calculated from the texts on this device while offline, so recalculate when coming back online
        // to get the server's figures.
        this.projectDataChangesSub = merge(
          this.onlineStatusService.onlineStatus$.pipe(distinctUntilChanged()),
          this.projectDoc.remoteChanges$.pipe(
            filter(ops => ops.some(op => TEXT_PATH_TEMPLATE.matches(op.p))),
            // TODO Find a better solution than merely throttling remote changes
            throttleTime(1000, asyncScheduler, { leading: true, trailing: true })
          )
        )
          .pipe(
            // Only the latest calculation may update the page, so a slow local calculation cannot overwrite the
            // server's figures after coming back online
            switchMap(() =>
              from(this.loadProgress(projectId)).pipe(
                // Report errors here so that one failed request doesn't stop later updates. A server request that fails
                // because the connection dropped needs no report, since going offline starts a local calculation.
                catchError(error => {
                  if (this.onlineStatusService.isOnline) this.errorHandler.handleError(error);
                  return EMPTY;
                })
              )
            ),
            // onlineStatus$ outlives this page, so stop recalculating once the page is left
            quietTakeUntilDestroyed(this.destroyRef)
          )
          .subscribe(({ progress, isComplete }) => {
            this.projectProgress = progress;
            this.progressIsPartial = !isComplete;
          });
      });
  }

  private async loadProgress(projectId: string): Promise<{ progress: ProjectProgress; isComplete: boolean }> {
    this.loadingStarted();
    try {
      if (this.onlineStatusService.isOnline) {
        return {
          progress: await this.progressService.getProgress(projectId, { maxStalenessMs: 30_000 }),
          isComplete: true
        };
      }
      return await this.progressService.getLocalProgress(projectId);
    } finally {
      this.loadingFinished();
    }
  }

  getBookNameFromId(bookId: string): string {
    const bookNum = Canon.bookIdToNumber(bookId);
    return this.i18n.localizeBook(bookNum);
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

import { NgClass } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatExpansionPanel,
  MatExpansionPanelContent,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { Canon } from '@sillsdev/scripture';
import { TextInfo } from 'realtime-server/lib/esm/scriptureforge/models/text-info';
import { asyncScheduler, merge, Subscription } from 'rxjs';
import { map, tap, throttleTime } from 'rxjs/operators';
import { DataLoadingComponent } from 'xforge-common/data-loading-component';
import { DonutChartComponent } from 'xforge-common/donut-chart/donut-chart.component';
import { I18nService } from 'xforge-common/i18n.service';
import { L10nNumberPipe } from 'xforge-common/l10n-number.pipe';
import { RealtimeQuery } from 'xforge-common/models/realtime-query';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { RouterLinkDirective } from 'xforge-common/router-link.directive';
import { UserService } from 'xforge-common/user.service';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { QuestionDoc } from '../../core/models/question-doc';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { SFProjectUserConfigDoc } from '../../core/models/sf-project-user-config-doc';
import { TextDocId } from '../../core/models/text-doc';
import { PermissionsService } from '../../core/permissions.service';
import { SFProjectService } from '../../core/sf-project.service';
import { CheckingUtils } from '../checking.utils';
import { CheckingQuestionsService } from '../checking/checking-questions.service';

/** Displays a community checker's personal progress on community checking questions, broken down by book and chapter. */
@Component({
  selector: 'app-my-progress',
  templateUrl: './my-progress.component.html',
  styleUrls: ['./my-progress.component.scss'],
  imports: [
    TranslocoModule,
    NgClass,
    MatCard,
    MatCardContent,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelContent,
    MatIcon,
    MatTooltip,
    DonutChartComponent,
    RouterLinkDirective,
    L10nNumberPipe
  ]
})
export class MyProgressComponent extends DataLoadingComponent implements OnInit, OnDestroy {
  texts: TextInfo[] = [];
  projectId?: string;

  private questionDocs = new Map<string, QuestionDoc[]>();
  private projectDoc?: SFProjectProfileDoc;
  private dataChangesSub?: Subscription;
  private projectUserConfigDoc?: SFProjectUserConfigDoc;
  private questionsQuery?: RealtimeQuery<QuestionDoc>;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly activatedRoute: ActivatedRoute,
    noticeService: NoticeService,
    readonly i18n: I18nService,
    private readonly projectService: SFProjectService,
    private readonly checkingQuestionsService: CheckingQuestionsService,
    private readonly userService: UserService,
    private readonly permissions: PermissionsService,
    private readonly onlineStatusService: OnlineStatusService
  ) {
    super(noticeService);
  }

  get showQuestionsLoadingMessage(): boolean {
    return !this.questionsLoaded && this.allQuestionsCount === 0;
  }

  get showNoQuestionsMessage(): boolean {
    return this.questionsLoaded && this.allQuestionsCount === 0;
  }

  get allQuestionsCount(): number {
    if (this.questionsQuery == null) {
      return 0;
    }
    return this.questionsQuery.docs.filter(qd => qd.data != null && !qd.data.isArchived).length;
  }

  get myAnswerCount(): number {
    let count: number = 0;
    const currentUserId = this.userService.currentUserId;
    for (const questionDoc of this.allPublishedQuestions) {
      if (questionDoc.data != null) {
        count += questionDoc.getAnswers(currentUserId).length;
      }
    }
    return count;
  }

  get myCommentCount(): number {
    let count: number = 0;
    const currentUserId = this.userService.currentUserId;
    for (const questionDoc of this.allPublishedQuestions) {
      if (questionDoc.data != null) {
        for (const answer of questionDoc.getAnswers()) {
          count += answer.comments.filter(c => c.ownerRef === currentUserId && !c.deleted).length;
        }
      }
    }
    return count;
  }

  get myLikeCount(): number {
    let count: number = 0;
    const currentUserId = this.userService.currentUserId;
    for (const questionDoc of this.allPublishedQuestions) {
      if (questionDoc.data != null) {
        for (const answer of questionDoc.getAnswers()) {
          count += answer.likes.filter(l => l.ownerRef === currentUserId).length;
        }
      }
    }
    return count;
  }

  get canSeeOtherUserResponses(): boolean {
    return this.projectDoc?.data?.checkingConfig.usersSeeEachOthersResponses === true;
  }

  private get allPublishedQuestions(): QuestionDoc[] {
    if (this.questionsQuery == null) {
      return [];
    }
    return this.questionsQuery.docs.filter(qd => qd.data != null && !qd.data.isArchived);
  }

  private get questionsLoaded(): boolean {
    // if the user is offline, 'ready' will never be true, but the query will still return the offline docs
    return !this.onlineStatusService.isOnline || this.questionsQuery?.ready === true;
  }

  ngOnInit(): void {
    let projectDocPromise: Promise<SFProjectProfileDoc>;
    const projectId$ = this.activatedRoute.params.pipe(
      tap(params => {
        this.loadingStarted();
        projectDocPromise = this.projectService.getProfile(params['projectId']);
      }),
      map(params => params['projectId'] as string)
    );
    projectId$.pipe(quietTakeUntilDestroyed(this.destroyRef)).subscribe(async projectId => {
      this.loadingStarted();
      this.projectId = projectId;
      try {
        this.projectDoc = await projectDocPromise;
        this.projectUserConfigDoc = await this.projectService.getUserConfig(projectId, this.userService.currentUserId);
        this.questionsQuery?.dispose();
        this.questionsQuery = await this.checkingQuestionsService.queryQuestions(
          projectId,
          { sort: true },
          this.destroyRef
        );
        this.initTexts();
      } finally {
        this.loadingFinished();
      }

      if (this.dataChangesSub != null) {
        this.dataChangesSub.unsubscribe();
      }
      this.dataChangesSub = merge(
        this.projectDoc.remoteChanges$,
        this.questionsQuery.remoteChanges$,
        this.questionsQuery.localChanges$
      )
        // TODO Find a better solution than merely throttling remote changes
        .pipe(throttleTime(1000, asyncScheduler, { leading: true, trailing: true }))
        .subscribe(() => {
          if (this.projectDoc != null && this.projectDoc.data != null) {
            if (this.permissions.canAccessCommunityChecking(this.projectDoc)) {
              this.initTextsWithLoadingIndicator();
            }
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.dataChangesSub?.unsubscribe();
    this.questionsQuery?.dispose();
  }

  getBookRouterLink(bookId: string): string[] {
    if (this.projectId == null) {
      return [];
    }
    return ['/projects', this.projectId, 'checking', bookId];
  }

  getChapterRouterLink(bookId: string, chapter: number): string[] {
    if (this.projectId == null) {
      return [];
    }
    return ['/projects', this.projectId, 'checking', bookId, chapter.toString()];
  }

  getBookId(text: TextInfo): string {
    return Canon.bookNumberToId(text.bookNum);
  }

  getBookName(text: TextInfo): string {
    return this.i18n.localizeBook(text.bookNum);
  }

  bookQuestionCount(text: TextInfo): number {
    let count: number = 0;
    for (const chapter of text.chapters) {
      count += this.chapterQuestionCount(text.bookNum, chapter.number);
    }
    return count;
  }

  chapterQuestionCount(bookNum: number, chapterNum: number): number {
    if (this.projectDoc == null) {
      return 0;
    }
    const id: TextDocId = new TextDocId(this.projectDoc.id, bookNum, chapterNum);
    return (this.questionDocs.get(id.toString()) ?? []).filter(qd => !qd.data?.isArchived).length;
  }

  overallProgress(): number[] {
    let totalUnread: number = 0;
    let totalRead: number = 0;
    let totalAnswered: number = 0;
    for (const text of this.texts) {
      const [unread, read, answered] = this.bookProgress(text);
      totalUnread += unread;
      totalRead += read;
      totalAnswered += answered;
    }
    return [totalUnread, totalRead, totalAnswered];
  }

  bookProgress(text: TextInfo): number[] {
    let unread: number = 0;
    let read: number = 0;
    let answered: number = 0;
    for (const chapter of text.chapters) {
      const [cu, cr, ca] = this.chapterProgress(text.bookNum, chapter.number);
      unread += cu;
      read += cr;
      answered += ca;
    }
    return [unread, read, answered];
  }

  /** Returns [unread, read, answered] counts for the current user in the given chapter. */
  chapterProgress(bookNum: number, chapterNum: number): number[] {
    let unread: number = 0;
    let read: number = 0;
    let answered: number = 0;
    if (this.projectId != null) {
      const id: TextDocId = new TextDocId(this.projectId, bookNum, chapterNum);
      for (const questionDoc of this.getQuestionDocs(id)) {
        if (CheckingUtils.hasUserAnswered(questionDoc.data, this.userService.currentUserId)) {
          answered++;
        } else if (
          this.projectUserConfigDoc != null &&
          CheckingUtils.hasUserReadQuestion(questionDoc.data, this.projectUserConfigDoc.data)
        ) {
          read++;
        } else {
          unread++;
        }
      }
    }
    return [unread, read, answered];
  }

  /** Returns true if the current user has answered every question in the given chapter. */
  isChapterComplete(bookNum: number, chapterNum: number): boolean {
    const total: number = this.chapterQuestionCount(bookNum, chapterNum);
    if (total === 0) {
      return false;
    }
    const [, , answered] = this.chapterProgress(bookNum, chapterNum);
    return answered === total;
  }

  getQuestionDocs(textDocId: TextDocId): QuestionDoc[] {
    return (this.questionDocs.get(textDocId.toString()) ?? []).filter(qd => !qd.data?.isArchived);
  }

  private initTextsWithLoadingIndicator(): void {
    this.loadingStarted();
    try {
      this.initTexts();
    } finally {
      this.loadingFinished();
    }
  }

  private initTexts(): void {
    if (this.projectDoc == null || this.projectDoc.data == null || this.questionsQuery == null) {
      return;
    }

    this.questionDocs.clear();
    this.texts = [];
    for (const text of this.projectDoc.data.texts.slice().sort((a, b) => a.bookNum - b.bookNum)) {
      // ignore empty books
      if (text.chapters.length === 1 && text.chapters[0].lastVerse === 0) {
        continue;
      }
      this.texts.push(text);
      for (const chapter of text.chapters) {
        const textId: TextDocId = new TextDocId(this.projectDoc.id, text.bookNum, chapter.number);
        this.questionDocs.set(textId.toString(), []);
      }
    }

    for (const questionDoc of this.questionsQuery.docs) {
      this.addQuestionDoc(questionDoc);
    }
  }

  private addQuestionDoc(questionDoc: QuestionDoc): void {
    if (this.projectDoc == null || questionDoc.data == null) {
      return;
    }
    const textId: TextDocId = new TextDocId(
      this.projectDoc.id,
      questionDoc.data.verseRef.bookNum,
      questionDoc.data.verseRef.chapterNum
    );
    const textQuestionDocs: QuestionDoc[] | undefined = this.questionDocs.get(textId.toString());
    if (textQuestionDocs != null) {
      textQuestionDocs.push(questionDoc);
    }
  }
}

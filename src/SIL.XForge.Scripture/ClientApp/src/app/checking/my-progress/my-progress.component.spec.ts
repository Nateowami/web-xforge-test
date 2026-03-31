import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import {
  getQuestionDocId,
  Question,
  QUESTIONS_COLLECTION
} from 'realtime-server/lib/esm/scriptureforge/models/question';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SF_PROJECT_RIGHTS, SFProjectDomain } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { SFProjectRole } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-role';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import {
  getSFProjectUserConfigDocId,
  SFProjectUserConfig
} from 'realtime-server/lib/esm/scriptureforge/models/sf-project-user-config';
import { createTestProjectUserConfig } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-user-config-test-data';
import { of } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { noopDestroyRef } from 'xforge-common/realtime.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { QuestionDoc } from '../../core/models/question-doc';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { SFProjectUserConfigDoc } from '../../core/models/sf-project-user-config-doc';
import { SF_TYPE_REGISTRY } from '../../core/models/sf-type-registry';
import { SFProjectService } from '../../core/sf-project.service';
import { CheckingQuestionsService } from '../checking/checking-questions.service';
import { MyProgressComponent } from './my-progress.component';

const mockedActivatedRoute = mock(ActivatedRoute);
const mockedNoticeService = mock(NoticeService);
const mockedProjectService = mock(SFProjectService);
const mockedQuestionsService = mock(CheckingQuestionsService);
const mockedUserService = mock(UserService);

describe('MyProgressComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      provideTestOnlineStatus(),
      provideTestRealtime(SF_TYPE_REGISTRY),
      { provide: ActivatedRoute, useMock: mockedActivatedRoute },
      { provide: NoticeService, useMock: mockedNoticeService },
      { provide: SFProjectService, useMock: mockedProjectService },
      { provide: CheckingQuestionsService, useMock: mockedQuestionsService },
      { provide: UserService, useMock: mockedUserService },
      { provide: OnlineStatusService, useClass: TestOnlineStatusService }
    ]
  }));

  describe('Book and chapter progress', () => {
    it('should display progress chart for community checker', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();
      expect(env.overallProgressChart).not.toBeNull();
      expect(env.booksProgressList).not.toBeNull();
    }));

    it('should display progress chart for project admin', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.adminUser);
      env.waitForQuestions();
      expect(env.overallProgressChart).not.toBeNull();
    }));

    it('should calculate the right progress proportions for a book', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // SUT
      const [unread, read, answered] = env.component.bookProgress({
        bookNum: 40,
        hasSource: false,
        chapters: [{ number: 1, lastVerse: 3, isValid: true, permissions: {} }],
        permissions: {}
      });
      expect(unread).toBe(3);
      expect(read).toBe(2);
      expect(answered).toBe(1);
    }));

    it('should calculate the right chapter progress', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // SUT
      const [unread, read, answered] = env.component.chapterProgress(40, 1);
      expect(unread).toBe(3);
      expect(read).toBe(2);
      expect(answered).toBe(1);
    }));

    it('should detect when a chapter is complete', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // Chapter 1 in book 42 (LUK) has 1 question, not answered by checker
      expect(env.component.isChapterComplete(42, 1)).toBeFalse();

      // MAT chapter 1: 6 questions, only 1 answered by checker
      expect(env.component.isChapterComplete(40, 1)).toBeFalse();
    }));

    it('should report complete chapter when all questions answered', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // Add a book with one question already answered
      env.addAnsweredQuestion();
      env.waitForProjectDocChanges();

      // SUT - MAT ch3 should be complete (1 question, answered)
      expect(env.component.isChapterComplete(40, 3)).toBeTrue();
    }));

    it('should show chapter complete icon when chapter is complete', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      env.addAnsweredQuestion();
      env.waitForProjectDocChanges();

      env.expandBookAtIndex(0);

      // The second chapter (chapter 3) should have a complete icon since all questions are answered
      const completeIcons = env.fixture.debugElement.queryAll(By.css('.chapter-tile.complete .complete-icon'));
      expect(completeIcons.length).toBeGreaterThan(0);
    }));

    it('should show book complete icon when all chapter questions are answered', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // Book 42 (LUK) has 1 question in ch1, not answered
      const [, , answeredLuk] = env.component.bookProgress({
        bookNum: 42,
        hasSource: false,
        chapters: [{ number: 1, lastVerse: 80, isValid: true, permissions: {} }],
        permissions: {}
      });
      expect(answeredLuk).toBe(0);
    }));

    it('should count chapter questions correctly', fakeAsync(() => {
      const env = new TestEnvironment();
      env.waitForQuestions();

      // SUT
      expect(env.component.chapterQuestionCount(40, 1)).toBe(6);
      expect(env.component.chapterQuestionCount(42, 1)).toBe(1);
    }));
  });

  describe('My contributions stats', () => {
    it('should calculate the right stats for community checker', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();

      // SUT
      expect(env.component.myAnswerCount).toBe(1);
      expect(env.component.myCommentCount).toBe(2);
      expect(env.component.myLikeCount).toBe(3);
    }));

    it('should hide like card if see other user responses is disabled', fakeAsync(() => {
      const env = new TestEnvironment();
      env.setCurrentUser(env.checkerUser);
      env.waitForQuestions();
      expect(env.likePanel).not.toBeNull();
      env.setSeeOtherUserResponses(false);
      expect(env.likePanel).toBeNull();
      env.setSeeOtherUserResponses(true);
      expect(env.likePanel).not.toBeNull();
    }));
  });

  describe('No questions', () => {
    it('should display "No questions" message when there are no questions', fakeAsync(() => {
      const env = new TestEnvironment(false);
      env.setCurrentUser(env.checkerUser);
      env.fixture.detectChanges();
      expect(env.loadingQuestionsLabel).not.toBeNull();
      expect(env.noQuestionsLabel).toBeNull();
      env.waitForQuestions();
      expect(env.loadingQuestionsLabel).toBeNull();
      expect(env.noQuestionsLabel).not.toBeNull();
    }));

    it('should not display loading message when user is offline', fakeAsync(() => {
      const env = new TestEnvironment();
      env.testOnlineStatusService.setIsOnline(false);
      tick();
      env.fixture.detectChanges();
      expect(env.loadingQuestionsLabel).toBeNull();
      env.waitForQuestions();
    }));
  });
});

interface UserInfo {
  id: string;
  role: string;
}

class TestEnvironment {
  component: MyProgressComponent;
  fixture: ComponentFixture<MyProgressComponent>;

  readonly realtimeService: TestRealtimeService = TestBed.inject<TestRealtimeService>(TestRealtimeService);
  readonly testOnlineStatusService: TestOnlineStatusService = TestBed.inject(
    OnlineStatusService
  ) as TestOnlineStatusService;

  adminUser: UserInfo = { id: 'user1', role: SFProjectRole.ParatextAdministrator };
  checkerUser: UserInfo = { id: 'user2', role: SFProjectRole.CommunityChecker };

  private readonly anotherUserId: string = 'anotherUserId';

  private adminProjectUserConfig: SFProjectUserConfig = createTestProjectUserConfig({
    projectRef: 'project01',
    ownerRef: this.adminUser.id,
    isTargetTextRight: true
  });

  private reviewerProjectUserConfig: SFProjectUserConfig = createTestProjectUserConfig({
    projectRef: 'project01',
    ownerRef: this.checkerUser.id,
    isTargetTextRight: true,
    // q1Id, q2Id, q3Id are marked as read (but not answered) by the checker
    questionRefsRead: ['q1Id', 'q2Id', 'q3Id']
  });

  private testProject: SFProjectProfile = createTestProjectProfile({
    texts: [
      {
        bookNum: 40,
        hasSource: false,
        chapters: [
          { number: 1, lastVerse: 25, isValid: true, permissions: {} },
          { number: 3, lastVerse: 17, isValid: true, permissions: {} }
        ],
        permissions: {}
      },
      {
        bookNum: 42,
        hasSource: false,
        chapters: [{ number: 1, lastVerse: 80, isValid: true, permissions: {} }],
        permissions: {}
      }
    ],
    userRoles: {
      [this.adminUser.id]: this.adminUser.role,
      [this.checkerUser.id]: this.checkerUser.role
    },
    userPermissions: {
      [this.adminUser.id]: [
        SF_PROJECT_RIGHTS.joinRight(SFProjectDomain.Questions, Operation.Create),
        SF_PROJECT_RIGHTS.joinRight(SFProjectDomain.Questions, Operation.Edit)
      ]
    }
  });

  constructor(withQuestionData: boolean = true) {
    if (withQuestionData) {
      this.realtimeService.addSnapshots<Question>(QuestionDoc.COLLECTION, [
        {
          id: getQuestionDocId('project01', 'q1Id'),
          data: {
            dataId: 'q1Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q1 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 3 },
            answers: [
              {
                dataId: 'a1Id',
                ownerRef: this.checkerUser.id,
                // checker answered q1
                likes: [{ ownerRef: this.checkerUser.id }, { ownerRef: this.anotherUserId }],
                dateCreated: '',
                dateModified: '',
                deleted: false,
                comments: [
                  {
                    dataId: 'c1Id',
                    ownerRef: this.checkerUser.id,
                    dateCreated: '',
                    dateModified: '',
                    deleted: false
                  }
                ]
              }
            ],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q2Id'),
          data: {
            dataId: 'q2Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q2 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 4 },
            answers: [
              {
                dataId: 'a2Id',
                ownerRef: this.anotherUserId,
                likes: [{ ownerRef: this.checkerUser.id }],
                dateCreated: '',
                dateModified: '',
                deleted: false,
                comments: [
                  {
                    dataId: 'c2Id',
                    ownerRef: this.checkerUser.id,
                    dateCreated: '',
                    dateModified: '',
                    deleted: false
                  }
                ]
              }
            ],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q3Id'),
          data: {
            dataId: 'q3Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q3 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 5 },
            answers: [
              {
                dataId: 'a3Id',
                ownerRef: this.anotherUserId,
                likes: [{ ownerRef: this.checkerUser.id }],
                dateCreated: '',
                dateModified: '',
                deleted: false,
                comments: []
              }
            ],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q4Id'),
          data: {
            dataId: 'q4Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q4 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 6 },
            answers: [],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q5Id'),
          data: {
            dataId: 'q5Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q5 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 7 },
            answers: [],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q6Id'),
          data: {
            dataId: 'q6Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q6 text',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 8 },
            answers: [],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          // Archived question - should not count
          id: getQuestionDocId('project01', 'q7Id'),
          data: {
            dataId: 'q7Id',
            projectRef: 'project01',
            ownerRef: this.adminUser.id,
            text: 'Book 1, Q7 archived',
            verseRef: { bookNum: 40, chapterNum: 1, verseNum: 9 },
            answers: [],
            isArchived: true,
            dateCreated: '',
            dateModified: ''
          }
        },
        {
          id: getQuestionDocId('project01', 'q8Id'),
          data: {
            dataId: 'q8Id',
            projectRef: 'project01',
            ownerRef: this.anotherUserId,
            text: 'Book 2, Q1 text',
            verseRef: { bookNum: 42, chapterNum: 1, verseNum: 1 },
            answers: [],
            isArchived: false,
            dateCreated: '',
            dateModified: ''
          }
        }
      ]);
    }

    this.realtimeService.addSnapshots<SFProjectProfile>(SFProjectProfileDoc.COLLECTION, [
      { id: 'project01', data: this.testProject }
    ]);
    this.realtimeService.addSnapshots<SFProjectUserConfig>(SFProjectUserConfigDoc.COLLECTION, [
      {
        id: getSFProjectUserConfigDocId('project01', this.adminUser.id),
        data: this.adminProjectUserConfig
      },
      {
        id: getSFProjectUserConfigDocId('project01', this.checkerUser.id),
        data: this.reviewerProjectUserConfig
      }
    ]);

    when(mockedActivatedRoute.params).thenReturn(of({ projectId: 'project01' }));
    when(mockedProjectService.getProfile('project01')).thenCall(id =>
      this.realtimeService.subscribe(SFProjectProfileDoc.COLLECTION, id)
    );
    when(mockedProjectService.getUserConfig('project01', this.adminUser.id)).thenCall((id, userId) =>
      this.realtimeService.subscribe(SFProjectUserConfigDoc.COLLECTION, getSFProjectUserConfigDocId(id, userId))
    );
    when(mockedProjectService.getUserConfig('project01', this.checkerUser.id)).thenCall((id, userId) =>
      this.realtimeService.subscribe(SFProjectUserConfigDoc.COLLECTION, getSFProjectUserConfigDocId(id, userId))
    );
    when(mockedQuestionsService.queryQuestions('project01', anything(), anything())).thenCall(() =>
      this.realtimeService.subscribeQuery(QuestionDoc.COLLECTION, {}, noopDestroyRef)
    );

    this.setCurrentUser(this.checkerUser);
    this.testOnlineStatusService.setIsOnline(true);

    this.fixture = TestBed.createComponent(MyProgressComponent);
    this.component = this.fixture.componentInstance;
  }

  get overallProgressChart(): HTMLElement | null {
    return this.fixture.debugElement.query(By.css('#overall-progress-chart'))?.nativeElement ?? null;
  }

  get booksProgressList(): HTMLElement | null {
    return this.fixture.debugElement.query(By.css('#books-progress-list'))?.nativeElement ?? null;
  }

  get noQuestionsLabel(): HTMLElement | null {
    return this.fixture.debugElement.query(By.css('#no-questions-label'))?.nativeElement ?? null;
  }

  get loadingQuestionsLabel(): HTMLElement | null {
    return this.fixture.debugElement.query(By.css('#loading-questions-message'))?.nativeElement ?? null;
  }

  get likePanel(): HTMLElement | null {
    return this.fixture.debugElement.query(By.css('.stat-panels .card-content-like'))?.nativeElement ?? null;
  }

  waitForQuestions(): void {
    this.realtimeService.updateQueryAdaptersRemote();
    this.fixture.detectChanges();
    this.waitForProjectDocChanges();
  }

  waitForProjectDocChanges(): void {
    tick(2000);
    this.fixture.detectChanges();
  }

  setCurrentUser(user: UserInfo): void {
    when(mockedUserService.currentUserId).thenReturn(user.id);
  }

  setSeeOtherUserResponses(isEnabled: boolean): void {
    const projectDoc: SFProjectProfileDoc = this.realtimeService.get(SFProjectProfileDoc.COLLECTION, 'project01');
    projectDoc.submitJson0Op(
      op => op.set<boolean>(p => p.checkingConfig.usersSeeEachOthersResponses, isEnabled),
      false
    );
    this.waitForProjectDocChanges();
  }

  expandBookAtIndex(index: number): void {
    const panels = this.fixture.debugElement.queryAll(By.css('#books-progress-list mat-expansion-panel'));
    if (panels[index] != null) {
      const panel = panels[index].componentInstance;
      panel.open();
      this.fixture.detectChanges();
    }
  }

  /** Adds a question in MAT chapter 3 that the checker has already answered, making that chapter complete. */
  addAnsweredQuestion(): void {
    this.realtimeService.addSnapshot<Question>(QUESTIONS_COLLECTION, {
      id: getQuestionDocId('project01', 'q_ch3_answered'),
      data: {
        dataId: 'q_ch3_answered',
        projectRef: 'project01',
        ownerRef: this.adminUser.id,
        text: 'MAT ch3 question answered by checker',
        verseRef: { bookNum: 40, chapterNum: 3, verseNum: 1 },
        answers: [
          {
            dataId: 'a_ch3',
            ownerRef: this.checkerUser.id,
            likes: [],
            dateCreated: '',
            dateModified: '',
            deleted: false,
            comments: []
          }
        ],
        isArchived: false,
        dateCreated: '',
        dateModified: ''
      }
    });
    this.realtimeService.updateQueryAdaptersRemote();
    this.fixture.detectChanges();
  }
}

import { SimpleChange } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { QuillService } from 'ngx-quill';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { createTestUser } from 'realtime-server/lib/esm/common/models/user-test-data';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import * as RichText from 'rich-text';
import { firstValueFrom, ReplaySubject } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { DialogService } from 'xforge-common/dialog.service';
import { FontService } from 'xforge-common/font.service';
import { UserDoc } from 'xforge-common/models/user-doc';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { provideTestRealtime } from 'xforge-common/test-realtime-providers';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { UserService } from 'xforge-common/user.service';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { SF_TYPE_REGISTRY } from '../../../core/models/sf-type-registry';
import { TextDoc, TextDocId } from '../../../core/models/text-doc';
import { SFProjectService } from '../../../core/sf-project.service';
import { CopyrightBannerComponent } from '../../../shared/copyright-banner/copyright-banner.component';
import { fakeResizeObserver, getTextDoc } from '../../../shared/test-utils';
import { provideQuillRegistrations } from '../../../shared/text/quill-editor-registration/quill-providers';
import { EDITOR_READY_TIMEOUT } from '../../../shared/text/text.component';
import { EditorResourceComponent } from './editor-resource.component';

describe('EditorResourceComponent', () => {
  let component: EditorResourceComponent;
  let fixture: ComponentFixture<EditorResourceComponent>;
  const mockSFProjectService = mock(SFProjectService);
  const mockFontService = mock(FontService);
  const mockDialogService = mock(DialogService);
  const mockUserService = mock(UserService);
  const projectDoc = {
    id: 'projectId',
    data: createTestProjectProfile()
  } as SFProjectProfileDoc;

  configureTestingModule(() => ({
    providers: [
      provideQuillRegistrations(),
      provideTestRealtime(SF_TYPE_REGISTRY),
      provideTestOnlineStatus(),
      { provide: OnlineStatusService, useClass: TestOnlineStatusService },
      { provide: SFProjectService, useMock: mockSFProjectService },
      { provide: FontService, useMock: mockFontService },
      { provide: DialogService, useMock: mockDialogService },
      { provide: UserService, useMock: mockUserService }
    ],
    imports: [CopyrightBannerComponent, getTestTranslocoModule()]
  }));

  beforeEach(async () => {
    fixture = TestBed.createComponent(EditorResourceComponent);
    component = fixture.componentInstance;
    component.resourceText = { editorCreated: new ReplaySubject<void>(1) } as any;
  });

  afterEach(() => {
    expect(true).toBe(true); // Suppress 'no expectations' warning
  });

  it('should not init when projectId, bookNum, or chapter is undefined', () => {
    component.projectId = undefined;
    component.bookNum = 1;
    component.chapter = 1;
    component['initProjectDetails']();

    component.resourceText.editorCreated.next();
    verify(mockSFProjectService.getProfile(anything())).never();

    component.projectId = 'test';
    component.bookNum = undefined;
    component.inputChanged$.next();
    verify(mockSFProjectService.getProfile(anything())).never();

    component.bookNum = 1;
    component.chapter = undefined;
    component.inputChanged$.next();
    verify(mockSFProjectService.getProfile(anything())).never();
  });

  it('should init when projectId, bookNum, and chapter are defined', fakeAsync(() => {
    const projectId = projectDoc.id;
    component.projectId = projectId;
    component.bookNum = 1;
    component.chapter = 1;
    when(mockSFProjectService.getProfile(projectId)).thenResolve(projectDoc);
    component['initProjectDetails']();
    component.resourceText.editorCreated.next();
    tick();
    verify(mockSFProjectService.getProfile(projectId)).once();
    verify(mockFontService.getFontFamilyFromProject(projectDoc)).once();
  }));

  it('can determine if a resource should display right-to-left', fakeAsync(() => {
    const projectId = 'rtl-project';
    component.projectId = projectId;
    component.bookNum = 1;
    component.chapter = 1;
    const rtlProjectDoc: SFProjectProfileDoc = {
      id: projectId,
      data: createTestProjectProfile({ isRightToLeft: true })
    } as SFProjectProfileDoc;
    when(mockSFProjectService.getProfile(projectId)).thenResolve(rtlProjectDoc);
    component['initProjectDetails']();
    component.resourceText.editorCreated.next();
    tick();
    expect(component.isRightToLeft).toBe(true);
  }));

  it('project copyright banner and copyright notice should init when they exist', fakeAsync(() => {
    const projectId = 'proj-notice';
    component.projectId = projectId;
    component.bookNum = 1;
    component.chapter = 1;
    const projectNoticeDoc: SFProjectProfileDoc = {
      id: projectId,
      data: createTestProjectProfile({ copyrightBanner: 'Test copyright', copyrightNotice: 'Test notice' })
    } as SFProjectProfileDoc;
    when(mockSFProjectService.getProfile(projectId)).thenResolve(projectNoticeDoc);
    component['initProjectDetails']();
    component.resourceText.editorCreated.next();
    tick();
    expect(component.hasCopyrightBanner).toBe(true);
    expect(component.copyrightBanner).toBe('Test copyright');
    expect(component.copyrightNotice).toBe('Test notice');
  }));

  it('project copyright banner and copyright notice should not init when they do not exist', fakeAsync(() => {
    const projectId = projectDoc.id;
    component.projectId = projectId;
    component.bookNum = 1;
    component.chapter = 1;
    when(mockSFProjectService.getProfile(projectId)).thenResolve(projectDoc);
    component['initProjectDetails']();
    component.resourceText.editorCreated.next();
    tick();
    expect(component.hasCopyrightBanner).toBe(false);
    expect(component.copyrightBanner).toBe('');
    expect(component.copyrightNotice).toBeFalsy();
  }));

  describe('scrollToSegment', () => {
    let scrollSegmentIntoView: jasmine.Spy;

    beforeEach(() => {
      scrollSegmentIntoView = jasmine.createSpy('scrollSegmentIntoView');
      component.resourceText = { segment: { ref: 'verse_1_2' }, scrollSegmentIntoView } as any;
    });

    it('should scroll to the resource segment when the target is focused', () => {
      component.highlightSegment = true;
      component.scrollToSegment();
      expect(scrollSegmentIntoView).toHaveBeenCalledOnceWith('verse_1_2');
    });

    it('should not scroll when the target is not focused', () => {
      component.highlightSegment = false;
      component.scrollToSegment();
      expect(scrollSegmentIntoView).not.toHaveBeenCalled();
    });

    it('should scroll when the target regains focus on the same segment', () => {
      component.highlightSegment = true;
      component.ngOnChanges({ highlightSegment: new SimpleChange(false, true, false) });
      expect(scrollSegmentIntoView).toHaveBeenCalledOnceWith('verse_1_2');
    });

    it('should wait for the resource text to change segment when the target segment changes', () => {
      component.highlightSegment = true;
      component.ngOnChanges({
        highlightSegment: new SimpleChange(false, true, false),
        segmentRef: new SimpleChange('verse_1_2', 'verse_1_3', false)
      });
      expect(scrollSegmentIntoView).not.toHaveBeenCalled();
    });

    describe('with the resource text', () => {
      let resourceFixture: ComponentFixture<EditorResourceComponent>;
      let scrollSegmentIntoView: jasmine.Spy;

      beforeEach(async () => {
        const realtimeService: TestRealtimeService = TestBed.inject(TestRealtimeService);
        const textDocId = new TextDocId(projectDoc.id, 40, 1, 'target');
        realtimeService.addSnapshot(TextDoc.COLLECTION, {
          id: textDocId.toString(),
          type: RichText.type.name,
          data: getTextDoc(textDocId)
        });
        realtimeService.addSnapshot<User>(UserDoc.COLLECTION, {
          id: 'user01',
          data: createTestUser({ sites: { sf: { projects: [projectDoc.id] } } })
        });
        const resourceProjectDoc = {
          id: projectDoc.id,
          data: createTestProjectProfile({
            texts: [
              {
                bookNum: 40,
                chapters: [{ number: 1, lastVerse: 7, isValid: true, permissions: {} }],
                hasSource: false,
                permissions: {}
              }
            ]
          })
        } as SFProjectProfileDoc;
        when(mockSFProjectService.getProfile(projectDoc.id)).thenResolve(resourceProjectDoc);
        when(mockSFProjectService.getText(anything())).thenCall(id =>
          realtimeService.subscribe(TextDoc.COLLECTION, id.toString())
        );
        when(mockUserService.getCurrentUser()).thenCall(() => realtimeService.subscribe(UserDoc.COLLECTION, 'user01'));
        // Load Quill before the editor is created, as it is loaded asynchronously
        await firstValueFrom(TestBed.inject(QuillService).getQuill());

        resourceFixture = TestBed.createComponent(EditorResourceComponent);
        resourceFixture.componentRef.setInput('projectId', projectDoc.id);
        resourceFixture.componentRef.setInput('bookNum', 40);
        resourceFixture.componentRef.setInput('chapter', 1);
        resourceFixture.componentRef.setInput('segmentRef', 'verse_1_1');
        resourceFixture.componentRef.setInput('highlightSegment', true);
      });

      function loadResourceText(): void {
        resourceFixture.detectChanges();
        tick(EDITOR_READY_TIMEOUT);
        resourceFixture.detectChanges();
        scrollSegmentIntoView = spyOn(resourceFixture.componentInstance.resourceText, 'scrollSegmentIntoView');
      }

      it('should scroll to the verse when the target moves to another verse', fakeAsync(() => {
        loadResourceText();

        resourceFixture.componentRef.setInput('segmentRef', 'verse_1_3');
        resourceFixture.detectChanges();
        expect(scrollSegmentIntoView).toHaveBeenCalledOnceWith('verse_1_3');
        flush();
      }));

      it('should scroll to the verse when the tab is shown', fakeAsync(() => {
        const resizeObserver = fakeResizeObserver();
        loadResourceText();

        // The resource tab is behind another tab, so it cannot be scrolled when the user moves to another verse
        resizeObserver.setShown(resourceFixture.nativeElement, false);
        resourceFixture.componentRef.setInput('segmentRef', 'verse_1_3');
        resourceFixture.detectChanges();
        scrollSegmentIntoView.calls.reset();

        resizeObserver.setShown(resourceFixture.nativeElement, true);
        expect(scrollSegmentIntoView).toHaveBeenCalledOnceWith('verse_1_3');
        flush();
      }));
    });
  });
});

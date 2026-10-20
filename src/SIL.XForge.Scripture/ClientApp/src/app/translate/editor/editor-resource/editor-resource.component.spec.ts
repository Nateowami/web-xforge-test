import { SimpleChange } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { ReplaySubject } from 'rxjs';
import { anything, mock, verify, when } from 'ts-mockito';
import { DialogService } from 'xforge-common/dialog.service';
import { FontService } from 'xforge-common/font.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { SFProjectService } from '../../../core/sf-project.service';
import { CopyrightBannerComponent } from '../../../shared/copyright-banner/copyright-banner.component';
import { EditorResourceComponent } from './editor-resource.component';

describe('EditorResourceComponent', () => {
  let component: EditorResourceComponent;
  let fixture: ComponentFixture<EditorResourceComponent>;
  const mockSFProjectService = mock(SFProjectService);
  const mockFontService = mock(FontService);
  const mockDialogService = mock(DialogService);
  const projectDoc = {
    id: 'projectId',
    data: createTestProjectProfile()
  } as SFProjectProfileDoc;

  configureTestingModule(() => ({
    providers: [
      { provide: SFProjectService, useMock: mockSFProjectService },
      { provide: FontService, useMock: mockFontService },
      { provide: DialogService, useMock: mockDialogService }
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
  });
});

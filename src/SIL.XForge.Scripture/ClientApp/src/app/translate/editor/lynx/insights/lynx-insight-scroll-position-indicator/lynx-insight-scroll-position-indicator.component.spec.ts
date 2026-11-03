import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { configureTestingModule } from 'xforge-common/test-utils';
import { TextDocId } from '../../../../../core/models/text-doc';
import { EditorReadyService } from '../base-services/editor-ready.service';
import { LynxEditorAdapterFactory, TestLynxEditorAdapterFactory } from '../lynx-editor-adapter-factory';
import { LynxInsight } from '../lynx-insight';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { QuillEditorReadyService } from '../quill-services/quill-editor-ready.service';
import {
  LynxInsightScrollPositionIndicatorComponent,
  SCROLL_POSITION_RESIZE_DEBOUNCE_MS
} from './lynx-insight-scroll-position-indicator.component';

const mockInsightStateService = mock(LynxInsightStateService);
const mockEditorReadyService = mock(QuillEditorReadyService);

describe('LynxInsightScrollPositionIndicatorComponent', () => {
  configureTestingModule(() => ({
    imports: [LynxInsightScrollPositionIndicatorComponent],
    providers: [
      { provide: LynxInsightStateService, useMock: mockInsightStateService },
      { provide: EditorReadyService, useMock: mockEditorReadyService },
      { provide: LynxEditorAdapterFactory, useClass: TestLynxEditorAdapterFactory }
    ]
  }));

  let env: TestEnvironment;

  afterEach(() => {
    env.fixture.destroy();
    env.editorRoot.remove();
  });

  it('positions a marker for each insight', async () => {
    env = new TestEnvironment();
    await env.settle();

    expect(env.markerPositions).toEqual(['50%']);
  });

  it('moves the markers when the editor is resized without the window being resized', async () => {
    env = new TestEnvironment();
    await env.settle();
    expect(env.markerPositions).toEqual(['50%']);

    // Like a neighbouring editor pane being hidden or shown, which reflows the text
    env.editorRoot.style.width = '800px';
    await env.settle();

    expect(env.markerPositions).toEqual(['25%']);
  });
});

class TestEnvironment {
  readonly fixture: ComponentFixture<LynxInsightScrollPositionIndicatorComponent>;
  readonly editorRoot: HTMLElement = document.createElement('div');

  constructor() {
    this.editorRoot.style.width = '400px';
    this.editorRoot.style.height = '200px';
    document.body.appendChild(this.editorRoot);

    const insight: LynxInsight = {
      id: 'insight-1',
      type: 'warning',
      textDocId: new TextDocId('project1', 40, 1),
      range: { index: 5, length: 10 },
      code: 'TEST001',
      source: 'test-source',
      description: 'Test insight description'
    };
    when(mockInsightStateService.filteredChapterInsights$).thenReturn(new BehaviorSubject([insight]));
    when(mockEditorReadyService.listenEditorReadyState(anything())).thenReturn(new BehaviorSubject(true));

    // The insight moves up as the editor widens, as text does when it reflows into fewer lines
    const editor = {
      getEditor: () => editor,
      getRoot: () => this.editorRoot,
      getScrollingContainer: () => this.editorRoot,
      getBounds: () => {
        const top = 40000 / this.editorRoot.clientWidth;
        return { top, left: 0, right: 0, bottom: top + 20, width: 0, height: 20 };
      }
    } as any;

    this.fixture = TestBed.createComponent(LynxInsightScrollPositionIndicatorComponent);
    this.fixture.componentRef.setInput('editor', editor);
    // Rely on the zone to render updates, as the app does, rather than calling detectChanges() after each step
    this.fixture.autoDetectChanges();
  }

  get markerPositions(): string[] {
    const markers = (this.fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.indicator');
    return Array.from(markers).map(marker => marker.style.getPropertyValue('--scroll-position-percent').trim());
  }

  /**
   * Waits for the ResizeObserver to report and for the component's resize debounce to pass. ResizeObserver runs on real
   * frames, which fakeAsync cannot advance, so this waits in real time.
   */
  async settle(): Promise<void> {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, SCROLL_POSITION_RESIZE_DEBOUNCE_MS + 50));
  }
}

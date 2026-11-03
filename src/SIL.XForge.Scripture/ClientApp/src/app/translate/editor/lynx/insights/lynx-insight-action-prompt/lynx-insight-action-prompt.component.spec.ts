import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { anything, mock, when } from 'ts-mockito';
import { configureTestingModule } from 'xforge-common/test-utils';
import { TextDocId } from '../../../../../core/models/text-doc';
import { provideCustomIcons } from '../../../../../shared/custom-icons';
import { EditorReadyService } from '../base-services/editor-ready.service';
import { LynxTextModelConverter } from '../lynx-editor';
import { LynxEditorAdapterFactory, TestLynxEditorAdapterFactory } from '../lynx-editor-adapter-factory';
import { LynxInsight, LynxInsightDisplayState } from '../lynx-insight';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { QuillEditorReadyService } from '../quill-services/quill-editor-ready.service';
import { LynxInsightActionPromptComponent, PROMPT_RESIZE_DEBOUNCE_MS } from './lynx-insight-action-prompt.component';

const mockInsightStateService = mock(LynxInsightStateService);
const mockEditorReadyService = mock(QuillEditorReadyService);

describe('LynxInsightActionPromptComponent', () => {
  configureTestingModule(() => ({
    imports: [LynxInsightActionPromptComponent],
    providers: [
      provideCustomIcons(),
      { provide: LynxInsightStateService, useMock: mockInsightStateService },
      { provide: EditorReadyService, useMock: mockEditorReadyService },
      { provide: LynxEditorAdapterFactory, useClass: TestLynxEditorAdapterFactory }
    ]
  }));

  let env: TestEnvironment;

  afterEach(() => {
    env.editorRoot.remove();
  });

  it('positions the prompt at the end of the active insight', async () => {
    env = new TestEnvironment();
    await env.settle();

    expect(env.promptStyle.display).toBe('flex');
    expect(env.promptStyle.left).toBe('391px');
  });

  it('moves the prompt when the editor is resized without the window being resized', async () => {
    env = new TestEnvironment();
    await env.settle();
    expect(env.promptStyle.left).toBe('391px');

    // Like a neighbouring editor pane being hidden or shown, which reflows the text
    env.editorRoot.style.width = '600px';
    await env.settle();

    expect(env.promptStyle.left).toBe('591px');
  });
});

class TestEnvironment {
  readonly fixture: ComponentFixture<LynxInsightActionPromptComponent>;
  readonly editorRoot: HTMLElement = document.createElement('div');

  constructor() {
    this.editorRoot.style.width = '400px';
    this.editorRoot.style.height = '200px';
    this.editorRoot.style.lineHeight = '20px';
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
    const displayState: LynxInsightDisplayState = { activeInsightIds: [insight.id], cursorActiveInsightIds: [] };
    when(mockInsightStateService.displayState$).thenReturn(new BehaviorSubject(displayState));
    when(mockInsightStateService.getInsight(insight.id)).thenReturn(insight);
    when(mockEditorReadyService.listenEditorReadyState(anything())).thenReturn(new BehaviorSubject(true));

    // The end of the insight follows the editor width, as text does when it reflows
    const editor = {
      getEditor: () => editor,
      getRoot: () => this.editorRoot,
      getScrollingContainer: () => this.editorRoot,
      getBounds: () => ({ top: 30, left: 0, right: this.editorRoot.clientWidth, bottom: 50, width: 0, height: 20 })
    } as any;
    const textModelConverter = { dataRangeToEditorRange: range => range } as LynxTextModelConverter;

    this.fixture = TestBed.createComponent(LynxInsightActionPromptComponent);
    this.fixture.componentRef.setInput('editor', editor);
    this.fixture.componentRef.setInput('lynxTextModelConverter', textModelConverter);
    this.fixture.detectChanges();
  }

  get promptStyle(): CSSStyleDeclaration {
    return (this.fixture.nativeElement as HTMLElement).style;
  }

  /**
   * Waits for the ResizeObserver to report and for the prompt's resize debounce to pass. ResizeObserver runs on real
   * frames, which fakeAsync cannot advance, so this waits in real time.
   */
  async settle(): Promise<void> {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, PROMPT_RESIZE_DEBOUNCE_MS + 50));
    this.fixture.detectChanges();
  }
}

import Quill, { Range } from 'quill';
import { Subject } from 'rxjs';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { TextDocId } from '../../../../../core/models/text-doc';
import { LynxTextModelConverter } from '../lynx-editor';
import { LynxInsight } from '../lynx-insight';
import { LynxInsightOverlayRef, LynxInsightOverlayService } from '../lynx-insight-overlay.service';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { QuillInsightRenderService } from './quill-insight-render.service';

describe('QuillInsightRenderService', () => {
  describe('renderActionOverlay', () => {
    it('should set editor selection at the editor position of the leading insight', () => {
      const env = new TestEnvironment();
      // Simulate one note embed before the insight, which shifts editor positions by one
      when(env.mockTextModelConverter.dataRangeToEditorRange(anything())).thenCall((range: Range) => ({
        index: range.index + 1,
        length: range.length
      }));

      env.service.renderActionOverlay([env.insight], env.editor, instance(env.mockTextModelConverter), true);

      verify(env.mockEditor.setSelection(11, 'api')).once();
      verify(env.mockEditor.setSelection(10, 'api')).never();
      verify(env.mockOverlayService.open(anything(), anything(), anything(), anything())).once();
    });

    it('should not set editor selection when action overlay is not active', () => {
      const env = new TestEnvironment();

      env.service.renderActionOverlay([env.insight], env.editor, instance(env.mockTextModelConverter), false);

      verify(env.mockEditor.setSelection(anything(), anything())).never();
      verify(env.mockOverlayService.open(anything(), anything(), anything(), anything())).never();
    });
  });
});

class TestEnvironment {
  readonly mockOverlayService = mock(LynxInsightOverlayService);
  readonly mockInsightState = mock(LynxInsightStateService);
  readonly mockEditor = mock(Quill);
  readonly mockTextModelConverter = mock<LynxTextModelConverter>();
  readonly service: QuillInsightRenderService;
  readonly editor: Quill;
  readonly insight: LynxInsight = {
    id: 'insight-1',
    type: 'warning',
    textDocId: new TextDocId('project01', 1, 1),
    range: { index: 10, length: 5 },
    code: 'code',
    source: 'source',
    description: 'description'
  };

  constructor() {
    const root: HTMLDivElement = document.createElement('div');
    root.innerHTML = `<lynx-insight data-insight-id="${this.insight.id}">text</lynx-insight>`;
    when(this.mockEditor.root).thenReturn(root);
    this.editor = instance(this.mockEditor);

    when(this.mockTextModelConverter.dataRangeToEditorRange(anything())).thenCall((range: Range) => range);
    const overlayRef: LynxInsightOverlayRef = {
      closed$: new Subject<void>(),
      hoverMultiInsight$: new Subject<LynxInsight | null>()
    } as LynxInsightOverlayRef;
    when(this.mockOverlayService.open(anything(), anything(), anything(), anything())).thenReturn(overlayRef);

    this.service = new QuillInsightRenderService(instance(this.mockOverlayService), instance(this.mockInsightState));
  }
}

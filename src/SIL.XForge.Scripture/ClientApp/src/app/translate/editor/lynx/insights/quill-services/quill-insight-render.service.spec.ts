import Quill, { Range } from 'quill';
import { anything, instance, mock, when } from 'ts-mockito';
import { configureTestingModule } from 'xforge-common/test-utils';
import { LynxTextModelConverter } from '../lynx-editor';
import { LynxInsight } from '../lynx-insight';
import { LynxInsightOverlayService } from '../lynx-insight-overlay.service';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { LynxInsightBlot } from './blots/lynx-insight-blot';
import { QuillInsightRenderService } from './quill-insight-render.service';

const mockOverlayService = mock(LynxInsightOverlayService);
const mockInsightState = mock(LynxInsightStateService);

describe('QuillInsightRenderService', () => {
  configureTestingModule(() => ({
    providers: [
      { provide: LynxInsightOverlayService, useMock: mockOverlayService },
      { provide: LynxInsightStateService, useMock: mockInsightState }
    ]
  }));

  describe('renderActionOverlay', () => {
    it('should move the cursor to the insight position in editor coordinates', () => {
      const env = new TestEnvironment();

      env.service.renderActionOverlay([env.insight], env.editor, env.textModelConverter, true);

      // Insight ranges are in data coordinates, which exclude note embeds, so the cursor must be
      // moved to the corresponding editor position (here, one note embed precedes the insight).
      expect(env.selections).toEqual([{ index: 11, source: 'api' }]);
    });

    it('should not move the cursor when the action overlay is not active', () => {
      const env = new TestEnvironment();

      env.service.renderActionOverlay([env.insight], env.editor, env.textModelConverter, false);

      expect(env.selections).toEqual([]);
    });
  });
});

class TestEnvironment {
  readonly service: QuillInsightRenderService;
  readonly insight = { id: 'insight01', range: { index: 10, length: 1 } } as LynxInsight;
  readonly textModelConverter: LynxTextModelConverter;
  readonly editor: Quill;
  readonly selections: { index: number; source: string }[] = [];

  /** Number of note embeds that precede the insight in the editor. */
  private readonly noteEmbedCount = 1;

  constructor() {
    this.service = new QuillInsightRenderService(instance(mockOverlayService), instance(mockInsightState));

    const converterMock = mock<LynxTextModelConverter>();
    when(converterMock.dataRangeToEditorRange(anything())).thenCall((range: Range) => ({
      index: range.index + this.noteEmbedCount,
      length: range.length
    }));
    this.textModelConverter = instance(converterMock);

    const root = document.createElement('div');
    const insightElement = document.createElement(LynxInsightBlot.tagName);
    insightElement.dataset[LynxInsightBlot.idDatasetPropName] = this.insight.id;
    root.appendChild(insightElement);

    this.editor = {
      root,
      setSelection: (index: number, source: string) => this.selections.push({ index, source })
    } as unknown as Quill;
  }
}

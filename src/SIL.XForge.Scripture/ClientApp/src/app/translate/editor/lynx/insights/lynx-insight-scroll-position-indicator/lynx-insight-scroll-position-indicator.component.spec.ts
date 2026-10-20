import { DestroyRef } from '@angular/core';
import { Range } from 'quill';
import { BehaviorSubject, of } from 'rxjs';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { TextDocId } from '../../../../../core/models/text-doc';
import { EditorReadyService } from '../base-services/editor-ready.service';
import { LynxEditor, LynxTextModelConverter } from '../lynx-editor';
import { TestLynxEditorAdapterFactory } from '../lynx-editor-adapter-factory';
import { LynxInsight } from '../lynx-insight';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { LynxInsightScrollPositionIndicatorComponent } from './lynx-insight-scroll-position-indicator.component';

describe('LynxInsightScrollPositionIndicatorComponent', () => {
  it('should position insights using editor positions', () => {
    const env = new TestEnvironment();
    // Simulate one note embed before the insight, which shifts editor positions by one
    when(env.mockTextModelConverter.dataRangeToEditorRange(anything())).thenCall((range: Range) => ({
      index: range.index + 1,
      length: range.length
    }));
    env.component.lynxTextModelConverter = instance(env.mockTextModelConverter);

    env.component.ngOnInit();

    verify(env.mockLynxEditor.getBounds(11, 1)).once();
    verify(env.mockLynxEditor.getBounds(10, 1)).never();
    expect(env.component.scrollPositions).toEqual([{ id: 'insight-1', type: 'warning', percent: 25 }]);
  });

  it('should fall back to data positions when no text model converter is set', () => {
    const env = new TestEnvironment();

    env.component.ngOnInit();

    verify(env.mockLynxEditor.getBounds(10, 1)).once();
  });
});

class TestEnvironment {
  readonly mockLynxEditor = mock<LynxEditor>();
  readonly mockTextModelConverter = mock<LynxTextModelConverter>();
  readonly mockInsightState = mock(LynxInsightStateService);
  readonly mockEditorReadyService = mock<EditorReadyService>();
  readonly component: LynxInsightScrollPositionIndicatorComponent;
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
    const lynxEditor: LynxEditor = instance(this.mockLynxEditor);
    when(this.mockLynxEditor.getEditor()).thenReturn({} as any);
    when(this.mockLynxEditor.getScrollingContainer()).thenReturn({ scrollTop: 0, scrollHeight: 400 } as Element);
    when(this.mockLynxEditor.getBounds(anything(), anything())).thenReturn({ top: 100 });
    when(this.mockEditorReadyService.listenEditorReadyState(anything())).thenReturn(of(true));
    when(this.mockInsightState.filteredChapterInsights$).thenReturn(new BehaviorSubject([this.insight]));

    const destroyRef = { onDestroy: () => () => {} } as unknown as DestroyRef;
    this.component = new LynxInsightScrollPositionIndicatorComponent(
      destroyRef,
      instance(this.mockInsightState),
      instance(this.mockEditorReadyService),
      new TestLynxEditorAdapterFactory()
    );
    this.component.editor = lynxEditor as any;
  }
}

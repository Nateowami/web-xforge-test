import { Component, DebugElement, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { I18nService } from 'xforge-common/i18n.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { TextDocId } from '../../../../../core/models/text-doc';
import { LynxEditor, LynxTextModelConverter } from '../lynx-editor';
import { EDITOR_INSIGHT_DEFAULTS, LynxInsight, LynxInsightAction, LynxInsightConfig } from '../lynx-insight';
import { LynxInsightOverlayService } from '../lynx-insight-overlay.service';
import { LynxInsightStateService } from '../lynx-insight-state.service';
import { LynxWorkspaceService } from '../lynx-workspace.service';
import { LynxInsightOverlayComponent } from './lynx-insight-overlay.component';

const mockLynxInsightStateService = mock(LynxInsightStateService);
const mockLynxInsightOverlayService = mock(LynxInsightOverlayService);
const mockLynxWorkspaceService = mock(LynxWorkspaceService);
const mockLynxEditor = mock<LynxEditor>();
const mockTextModelConverter = mock<LynxTextModelConverter>();
const mockedI18nService = mock(I18nService);

// Default insight config
const defaultInsightConfig: LynxInsightConfig = {
  filter: { types: ['info', 'warning', 'error'], scope: 'chapter' },
  sortOrder: 'severity',
  queryParamName: 'insight',
  actionOverlayApplyPrimaryActionChord: { altKey: true, shiftKey: true, key: 'Enter' },
  panelLinkTextGoalLength: 30,
  panelOptimizationThreshold: 10
};

@Component({
  template: `<app-lynx-insight-overlay
    #overlay
    [insights]="insights"
    [editor]="editor"
    [textModelConverter]="textModelConverter"
  ></app-lynx-insight-overlay>`,
  imports: [LynxInsightOverlayComponent]
})
class HostComponent {
  @ViewChild('overlay') component!: LynxInsightOverlayComponent;
  insights: LynxInsight[] = [];
  editor?: LynxEditor;
  textModelConverter?: LynxTextModelConverter;
}

describe('LynxInsightOverlayComponent', () => {
  configureTestingModule(() => ({
    imports: [LynxInsightOverlayComponent, getTestTranslocoModule(), HostComponent],
    providers: [
      { provide: LynxInsightStateService, useMock: mockLynxInsightStateService },
      { provide: LynxInsightOverlayService, useMock: mockLynxInsightOverlayService },
      { provide: LynxWorkspaceService, useMock: mockLynxWorkspaceService },
      { provide: I18nService, useMock: mockedI18nService },
      { provide: EDITOR_INSIGHT_DEFAULTS, useValue: defaultInsightConfig }
    ]
  }));

  it('should update contents when primary action clicked', fakeAsync(() => {
    const env = new TestEnvironment();

    env.clickPrimaryActionLink();

    verify(mockTextModelConverter.dataDeltaToEditorDelta(anything())).once();
    verify(mockLynxEditor.updateContents(anything(), 'user')).once();
    expect().nothing();
  }));

  it('should use rtl direction when i18n.direction is rtl', fakeAsync(() => {
    when(mockedI18nService.direction).thenReturn('rtl');
    const env = new TestEnvironment();

    const menuTrigger = env.fixture.debugElement.query(By.css('.action-menu-trigger'));
    expect(menuTrigger.nativeElement.getAttribute('dir')).toBe('rtl');
  }));

  it('should use ltr direction when i18n.direction is ltr', fakeAsync(() => {
    when(mockedI18nService.direction).thenReturn('ltr');
    const env = new TestEnvironment();

    const menuTrigger = env.fixture.debugElement.query(By.css('.action-menu-trigger'));
    expect(menuTrigger.nativeElement.getAttribute('dir')).toBe('ltr');
  }));

  it('should not show back button when there is only one insight', fakeAsync(() => {
    const env = new TestEnvironment();

    expect(env.component.focusedInsight).not.toBeUndefined();
    expect(env.backButton).toBeNull();
  }));

  it('should show back button after selecting an insight from the multi-insight list', fakeAsync(() => {
    const env = new TestEnvironment({ insightCount: 2 });

    // List is shown until an insight is selected
    expect(env.component.focusedInsight).toBeUndefined();
    expect(env.insightListItems.length).toBe(2);
    expect(env.backButton).toBeNull();

    env.selectInsightFromList(0);

    expect(env.component.focusedInsight?.id).toBe('test-insight-1');
    expect(env.backButton).not.toBeNull();
  }));

  it('should return to the multi-insight list when back button is clicked', fakeAsync(() => {
    const env = new TestEnvironment({ insightCount: 2 });
    env.selectInsightFromList(0);
    expect(env.component.primaryAction).not.toBeUndefined();

    env.clickBackButton();

    expect(env.component.focusedInsight).toBeUndefined();
    expect(env.component.primaryAction).toBeUndefined();
    expect(env.component.menuActions).toEqual([]);
    expect(env.insightListItems.length).toBe(2);

    // Editor attention is restored to all insights in the list
    expect(env.hoveredInsights).toEqual([null]);
  }));

  it('should not apply the primary action shortcut after returning to the list', fakeAsync(() => {
    const env = new TestEnvironment({ insightCount: 2 });
    env.selectInsightFromList(0);
    env.clickBackButton();

    resetCalls(mockLynxEditor);
    env.component.handleKeyDown(new KeyboardEvent('keydown', { altKey: true, shiftKey: true, key: 'Enter' }));

    verify(mockLynxEditor.updateContents(anything(), 'user')).never();
    expect().nothing();
  }));
});

class TestEnvironment {
  fixture: ComponentFixture<HostComponent>;
  hostComponent: HostComponent;
  component: LynxInsightOverlayComponent;
  hoveredInsights: (LynxInsight | null)[] = [];

  constructor(options: { insightCount?: number } = {}) {
    // Setup the test environment
    this.fixture = TestBed.createComponent(HostComponent);
    this.hostComponent = this.fixture.componentInstance;
    this.setupEditor(options.insightCount ?? 1);
    this.component = this.hostComponent.component;
    this.component.insightHover.subscribe(insight => this.hoveredInsights.push(insight));
  }

  private setupEditor(insightCount: number): void {
    const editor = instance(mockLynxEditor);
    const textModelConverter = instance(mockTextModelConverter);

    const insights: LynxInsight[] = Array.from({ length: insightCount }, (_, i) =>
      this.createTestInsight({ id: `test-insight-${i + 1}`, description: `Test insight description ${i + 1}` })
    );

    // Set up mocks for the editor root element
    const mockRoot = document.createElement('div');
    when(mockLynxEditor.getRoot()).thenReturn(mockRoot);
    when(mockLynxEditor.focus()).thenReturn();
    when(mockLynxEditor.updateContents(anything(), anything())).thenReturn();
    when(mockTextModelConverter.dataDeltaToEditorDelta(anything())).thenCall(delta => delta);
    when(mockLynxWorkspaceService.getActions(anything())).thenCall((insight: LynxInsight) =>
      Promise.resolve([this.createTestAction(insight, true), this.createTestAction(insight, false)])
    );

    this.hostComponent.insights = insights;
    this.hostComponent.editor = editor;
    this.hostComponent.textModelConverter = textModelConverter;
    this.fixture.detectChanges();
    flush();
    this.fixture.detectChanges();
  }

  get insightListItems(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('.main-section.list .insight-item'));
  }

  get backButton(): DebugElement | null {
    return this.fixture.debugElement.query(By.css('.back-icon'));
  }

  selectInsightFromList(index: number): void {
    this.insightListItems[index].triggerEventHandler('click');
    this.fixture.detectChanges();
    flush();
    this.fixture.detectChanges();
  }

  clickBackButton(): void {
    this.backButton!.triggerEventHandler('click');
    this.fixture.detectChanges();
    flush();
    this.fixture.detectChanges();
  }

  clickPrimaryActionLink(): void {
    const link = this.fixture.debugElement.query(By.css('.primary-action a'));
    link.triggerEventHandler('click');
    this.fixture.detectChanges();
  }

  private createTestInsight(props: Partial<LynxInsight> = {}): LynxInsight {
    return {
      id: props.id ?? 'test-insight-1',
      type: props.type ?? 'warning',
      textDocId: props.textDocId ?? new TextDocId('project01', 40, 1),
      range: props.range ?? { index: 5, length: 10 },
      code: props.code ?? 'TEST001',
      source: props.source ?? 'test-source',
      description: props.description ?? 'Test insight description',
      moreInfo: props.moreInfo,
      data: props.data,
      ...props
    };
  }

  private createTestAction(insight: LynxInsight, isPrimary: boolean = false): LynxInsightAction {
    return {
      id: `action-${insight.id}`,
      insight: insight,
      label: `Action for ${insight.description}`,
      description: 'Test action description',
      isPrimary: isPrimary,
      ops: [{ insert: 'test action text' }]
    };
  }
}

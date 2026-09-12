import { TestBed } from '@angular/core/testing';
import Quill, { Delta, Range } from 'quill';
import { instance, mock, when } from 'ts-mockito';
import { configureTestingModule } from 'xforge-common/test-utils';
import { TextViewModel } from './text-view-model';

describe('TextViewModel', () => {
  const mockQuill = mock<Quill>();
  let testDelta: Delta;

  configureTestingModule(() => ({
    providers: [TextViewModel, { provide: Quill, useMock: mockQuill }]
  }));

  describe('dataRangeToEditorRange', () => {
    it('should return same range when there are no note embeds', () => {
      const env = new TestEnvironment();
      env.setupBasicContent();

      const dataRange: Range = { index: 1, length: 4 };
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      expect(result).toEqual(dataRange);
    });

    it('should adjust range when note embeds exist before the range', () => {
      const env = new TestEnvironment();
      env.setupContentWithEmbedBefore();

      const dataRange: Range = { index: 5, length: 6 }; // ' world'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Index should be increased by 1 to account for note embed
      expect(result).toEqual({ index: 6, length: 6 });
    });

    it('should handle note embeds within the range', () => {
      const env = new TestEnvironment();
      env.setupContentWithEmbedInMiddle();

      const dataRange: Range = { index: 0, length: 11 }; // 'Hello world'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Length should be increased by 1 to account for note embed
      expect(result).toEqual({ index: 0, length: 12 });
    });

    it('should handle multiple note embeds', () => {
      const env = new TestEnvironment();
      env.setupContentWithMultipleEmbeds();

      const dataRange: Range = { index: 0, length: 11 }; // 'Hello world'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Length should be increased by 2 to account for both note embeds
      expect(result).toEqual({ index: 0, length: 13 });
    });

    it('should handle a zero-length range before embed', () => {
      const env = new TestEnvironment();
      env.setupContentWithEmbedInMiddle();

      const dataRange: Range = { index: 4, length: 0 }; // Start of 'o' in 'Hello'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Index should remain the same since embed is after this position
      expect(result).toEqual({ index: 4, length: 0 });
    });

    it('should handle a zero-length range after an embed', () => {
      const env = new TestEnvironment();
      env.setupContentWithEmbedBefore();

      const dataRange: Range = { index: 5, length: 0 }; // Start of ' world'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Index should be increased by 1 because of embed
      expect(result).toEqual({ index: 6, length: 0 });
    });

    it('should handle range at the end of document', () => {
      const env = new TestEnvironment();
      env.setupContentWithEmbedBefore();

      const dataRange: Range = { index: 11, length: 0 }; // End of text
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Index should be 12 due to the embed
      expect(result).toEqual({ index: 12, length: 0 });
    });

    it('should handle non-string inserts (other embeds)', () => {
      const env = new TestEnvironment();
      env.setupContentWithOtherEmbed();

      const dataRange: Range = { index: 0, length: 12 }; // 'Hello {image} world'
      const result: Range = env.textViewModel.dataRangeToEditorRange(dataRange);

      // Length should be increased by 1 to account for note embed
      expect(result).toEqual({ index: 0, length: 13 });
    });
  });

  describe('dataDeltaToEditorDelta', () => {
    it('should keep the attributes of an inserted paragraph', () => {
      const env = new TestEnvironment();
      env.setupBasicContent();
      env.setupFormatAtPosition(5);

      // a remote change that inserts a new paragraph, as applying a draft or syncing does
      const dataDelta = new Delta([
        { retain: 5 },
        { insert: 'A remark', attributes: { segment: 'rem_1' } },
        { insert: '\n', attributes: { para: { style: 'rem' } } }
      ]);

      const result: Delta = env.textViewModel.dataDeltaToEditorDelta(dataDelta);

      expect(result.ops.length).toEqual(3);
      // the segment and paragraph style the op specifies win over the ones at the insertion point
      expect(result.ops[1].attributes).toEqual({ para: { style: 'h' }, segment: 'rem_1', 'para-contents': true });
      expect(result.ops[2].attributes).toEqual({ para: { style: 'rem' }, segment: 'h_1', 'para-contents': true });
    });

    it('should format an insert without attributes with the attributes at the insertion point', () => {
      const env = new TestEnvironment();
      env.setupBasicContent();
      env.setupFormatAtPosition(5);

      // text a remote user typed into an existing segment comes with no attributes of its own
      const dataDelta = new Delta([{ retain: 5 }, { insert: 'more text' }]);

      const result: Delta = env.textViewModel.dataDeltaToEditorDelta(dataDelta);

      expect(result.ops[1].attributes).toEqual({ para: { style: 'h' }, segment: 'h_1', 'para-contents': true });
    });
  });

  class TestEnvironment {
    readonly textViewModel: TextViewModel;

    constructor() {
      this.textViewModel = TestBed.inject(TextViewModel);
      this.textViewModel.editor = instance(mockQuill);
    }

    /** The formatting the editor reports at editorPosition, i.e. that of the text an insert lands before. */
    setupFormatAtPosition(editorPosition: number): void {
      when(mockQuill.getFormat(editorPosition)).thenCall(() => ({ para: { style: 'h' } }));
      when(mockQuill.getFormat(editorPosition, 1)).thenCall(() => ({ segment: 'h_1', 'para-contents': true }));
    }

    setupBasicContent(): void {
      testDelta = new Delta([{ insert: 'Hello world' }]);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }

    setupContentWithEmbedBefore(): void {
      testDelta = new Delta([{ insert: { 'note-thread-embed': true } }, { insert: 'Hello' }, { insert: ' world' }]);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }

    setupContentWithEmbedInMiddle(): void {
      testDelta = new Delta([{ insert: 'Hello ' }, { insert: { 'note-thread-embed': true } }, { insert: 'world' }]);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }

    setupContentWithMultipleEmbeds(): void {
      testDelta = new Delta([
        { insert: 'Hello' },
        { insert: { 'note-thread-embed': true } },
        { insert: ' w' },
        { insert: { 'note-thread-embed': true } },
        { insert: 'orld' }
      ]);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }

    setupContentWithOtherEmbed(): void {
      testDelta = new Delta([
        { insert: 'Hello ' },
        { insert: { image: 'url' } },
        { insert: { 'note-thread-embed': true } },
        { insert: ' world' }
      ]);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }
  }
});

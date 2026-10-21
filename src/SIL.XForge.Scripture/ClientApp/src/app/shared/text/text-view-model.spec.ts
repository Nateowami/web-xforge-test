import { TestBed } from '@angular/core/testing';
import Quill, { Delta, Range } from 'quill';
import { DeltaOperation } from 'rich-text';
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

  describe('table cells', () => {
    const row1Cell1 = { table: { id: 'table_1' }, row: { id: 'row_1_1' }, cell: { style: 'tc1', align: 'start' } };
    const row1Cell2 = { table: { id: 'table_1' }, row: { id: 'row_1_1' }, cell: { style: 'tc2', align: 'start' } };
    const row2Cell1 = { table: { id: 'table_1' }, row: { id: 'row_1_2' }, cell: { style: 'tc1', align: 'start' } };

    it('makes each cell a segment with the ref the server gave it', () => {
      const env = new TestEnvironment();
      // \p \v 1 A \tr \tc1 B \tc2 C \tr \tc1 D \p E
      env.setContents([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { blank: true }, attributes: { segment: 'p_1', initial: true } },
        { insert: { verse: { number: '1', style: 'v' } } },
        { insert: 'A', attributes: { segment: 'verse_1_1' } },
        { insert: '\n', attributes: { para: { style: 'p' } } },
        { insert: 'B', attributes: { segment: 'cell_1_1_1' } },
        { insert: '\n', attributes: row1Cell1 },
        { insert: 'C', attributes: { segment: 'cell_1_1_2' } },
        { insert: '\n', attributes: row1Cell2 },
        { insert: 'D', attributes: { segment: 'cell_1_2_1' } },
        { insert: '\n', attributes: row2Cell1 },
        { insert: 'E', attributes: { segment: 'verse_1_1/p_1' } },
        { insert: '\n', attributes: { para: { style: 'p' } } }
      ]);

      const fixDelta: Delta = env.updateSegments();

      expect(env.segmentRanges).toEqual([
        ['p_1', { index: 1, length: 1 }],
        ['verse_1_1', { index: 3, length: 1 }],
        ['cell_1_1_1', { index: 5, length: 1 }],
        ['cell_1_1_2', { index: 7, length: 1 }],
        ['cell_1_2_1', { index: 9, length: 1 }],
        ['verse_1_1/p_1', { index: 11, length: 1 }]
      ]);
      // Only para-contents is added. No segment ref is rewritten and no blank is inserted.
      expect(env.segmentAttributeChanges(fixDelta)).toEqual([]);
    });

    it('makes a blank segment for a cell that starts with a verse', () => {
      const env = new TestEnvironment();
      // \tr \tc1 \v 1 A
      env.setContents([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { blank: true }, attributes: { segment: 'cell_1_1_1', initial: true } },
        { insert: { verse: { number: '1', style: 'v' } } },
        { insert: 'A', attributes: { segment: 'verse_1_1' } },
        { insert: '\n', attributes: row1Cell1 }
      ]);

      const fixDelta: Delta = env.updateSegments();

      expect(env.segmentRanges).toEqual([
        ['cell_1_1_1', { index: 1, length: 1 }],
        ['verse_1_1', { index: 3, length: 1 }]
      ]);
      expect(env.segmentAttributeChanges(fixDelta)).toEqual([]);
    });

    it('keeps the segment of a cell whose text was deleted, and inserts a blank into it', () => {
      const env = new TestEnvironment();
      // \p \v 1 A \tr \tc1 B \tc2 C, after deleting "B"
      env.setContents([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { blank: true }, attributes: { segment: 'p_1', initial: true } },
        { insert: { verse: { number: '1', style: 'v' } } },
        { insert: 'A', attributes: { segment: 'verse_1_1' } },
        { insert: '\n', attributes: { para: { style: 'p' } } },
        { insert: '\n', attributes: row1Cell1 },
        { insert: 'C', attributes: { segment: 'cell_1_1_2' } },
        { insert: '\n', attributes: row1Cell2 }
      ]);

      const fixDelta: Delta = env.updateSegments();

      expect(env.segmentRanges).toEqual([
        ['p_1', { index: 1, length: 1 }],
        ['verse_1_1', { index: 3, length: 1 }],
        ['cell_1_1_1', { index: 5, length: 0 }],
        ['cell_1_1_2', { index: 6, length: 1 }]
      ]);
      expect(fixDelta.ops).toContain({
        insert: { blank: true },
        attributes: { segment: 'cell_1_1_1', 'para-contents': true, 'direction-segment': 'auto' }
      });
    });
  });

  class TestEnvironment {
    readonly textViewModel: TextViewModel;

    constructor() {
      this.textViewModel = TestBed.inject(TextViewModel);
      this.textViewModel.editor = instance(mockQuill);
    }

    get segmentRanges(): [string, Range][] {
      return Array.from(this.textViewModel.segments);
    }

    setContents(ops: DeltaOperation[]): void {
      testDelta = new Delta(ops);
      when(mockQuill.getContents()).thenReturn(testDelta);
    }

    updateSegments(): Delta {
      return this.textViewModel['updateSegments'](instance(mockQuill), true);
    }

    /** The ops of `fixDelta` that do more than mark text as para-contents. */
    segmentAttributeChanges(fixDelta: Delta): DeltaOperation[] {
      return (fixDelta.ops ?? []).filter(
        op => op.insert != null || Object.keys(op.attributes ?? {}).some(key => key !== 'para-contents')
      );
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

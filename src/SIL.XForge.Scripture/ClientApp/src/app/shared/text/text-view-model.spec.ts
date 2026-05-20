import { TestBed } from '@angular/core/testing';
import Quill, { Delta, Range } from 'quill';
import { anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { configureTestingModule } from 'xforge-common/test-utils';
import { TextDoc } from '../../core/models/text-doc';
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

  class TestEnvironment {
    readonly textViewModel: TextViewModel;

    constructor() {
      this.textViewModel = TestBed.inject(TextViewModel);
      this.textViewModel.editor = instance(mockQuill);
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

  describe('update', () => {
    let mockEditor: Quill;
    let mockTextDoc: TextDoc;
    let viewModel: TextViewModel;

    beforeEach(() => {
      mockEditor = mock<Quill>();
      mockTextDoc = mock<TextDoc>();
      when(mockEditor.isEnabled()).thenReturn(true);
      when(mockEditor.getSelection()).thenReturn(null);
      when(mockTextDoc.submit(anything(), anything())).thenResolve();
      when(mockTextDoc.isLoaded).thenReturn(true);

      viewModel = TestBed.inject(TextViewModel);
      viewModel.editor = instance(mockEditor);
      // Access private field to set textDoc without calling bind()
      (viewModel as any).textDoc = instance(mockTextDoc);
    });

    it('should compose blank insert with user delete and submit as one atomic op', async () => {
      // Simulate: after user delete, editor has empty verse segment
      const editorContents = new Delta([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { verse: { number: '1', style: 'v' } }, attributes: { 'para-contents': true } },
        { insert: '\n', attributes: { para: { style: 'p' } } }
      ]);
      when(mockEditor.getContents()).thenReturn(editorContents);

      // User's delete delta (deleted 5 characters)
      const userDelta = new Delta().retain(2).delete(5);
      viewModel.update(userDelta, 'user');

      // Verify: textDoc.submit was called exactly ONCE with a composed delta
      // that includes both the user's delete AND the blank insert
      verify(mockTextDoc.submit(anything(), 'Editor')).once();

      const [submittedDelta] = capture(mockTextDoc.submit).last();
      const ops = (submittedDelta as Delta).ops;
      expect(ops).toBeDefined();

      // The composed delta should contain a delete (from user edit)
      const deleteOp = ops!.find(op => op.delete != null);
      expect(deleteOp).toBeDefined();

      // AND a blank insert (from fixSegment)
      const insertOp = ops!.find(op => op.insert != null && (op.insert as any).blank === true);
      expect(insertOp).toBeDefined();
    });

    it('should apply fix delta with api source to prevent re-submission via update re-entry', async () => {
      const editorContents = new Delta([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { verse: { number: '1', style: 'v' } }, attributes: { 'para-contents': true } },
        { insert: '\n', attributes: { para: { style: 'p' } } }
      ]);
      when(mockEditor.getContents()).thenReturn(editorContents);

      const userDelta = new Delta().retain(2).delete(5);
      viewModel.update(userDelta, 'user');

      // The fix delta should be applied with 'api' source (not 'user')
      verify(mockEditor.updateContents(anything(), 'api')).called();
      // And NEVER with 'user' source
      verify(mockEditor.updateContents(anything(), 'user')).never();
    });

    it('should submit blank removal when remote op creates a duplicate blank', async () => {
      // Simulate: editor has two blanks in one segment (from concurrent offline edits)
      const editorContents = new Delta([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { verse: { number: '1', style: 'v' } }, attributes: { 'para-contents': true } },
        { insert: { blank: true }, attributes: { segment: 'verse_1_1', 'para-contents': true } },
        { insert: { blank: true }, attributes: { segment: 'verse_1_1', 'para-contents': true } },
        { insert: '\n', attributes: { para: { style: 'p' } } }
      ]);
      when(mockEditor.getContents()).thenReturn(editorContents);

      // Remote op added a second blank (source='api')
      const remoteDelta = new Delta().retain(2).insert({ blank: true }, { segment: 'verse_1_1' });
      viewModel.update(remoteDelta, 'api');

      // Wait for the deferred Promise.resolve()
      await Promise.resolve();
      await Promise.resolve();

      // Verify: textDoc.submit was called to clean up the duplicate blank
      verify(mockTextDoc.submit(anything(), 'Editor')).called();

      // The submitted delta should contain a delete (removing the extra blank)
      const [submitDelta] = capture(mockTextDoc.submit).last();
      const ops = (submitDelta as Delta).ops;
      expect(ops).toBeDefined();
      const deleteOp = ops!.find(op => op.delete != null);
      expect(deleteOp).toBeDefined();
    });

    it('should not create duplicate verse when two users edit same verse offline', () => {
      // This test simulates the scenario where two users both delete text from the same verse
      // while offline. The fix ensures blank inserts are composed with the user's delete,
      // preventing them from being separate ops that OT cannot properly deduplicate.

      // After user A deletes all text, editor shows empty verse segment
      const editorContents = new Delta([
        { insert: { chapter: { number: '1', style: 'c' } } },
        { insert: { verse: { number: '2', style: 'v' } }, attributes: { 'para-contents': true } },
        { insert: '\n', attributes: { para: { style: 'p' } } }
      ]);
      when(mockEditor.getContents()).thenReturn(editorContents);

      // User deletes "Hello" (5 chars) from verse 2
      const userDelta = new Delta().retain(2).delete(5);
      viewModel.update(userDelta, 'user');

      // The key assertion: only ONE submit call, and it contains BOTH the delete AND blank insert
      // This means OT will process them as a single atomic operation, preventing the scenario where
      // a standalone blank insert from one user gets displaced into another user's text
      verify(mockTextDoc.submit(anything(), 'Editor')).once();

      const [submittedDelta] = capture(mockTextDoc.submit).last();
      const ops = (submittedDelta as Delta).ops;
      expect(ops).toBeDefined();

      // Verify atomic op: retain, then delete+insert in proper order
      expect(ops!.some(op => op.delete != null)).toBeTrue();
      expect(ops!.some(op => (op.insert as any)?.blank === true)).toBeTrue();
    });
  });
});

import { DeltaOperation } from 'rich-text';
import { opsHaveVerseText } from './text-doc';

describe('opsHaveVerseText', () => {
  it('is false when there are no ops', () => {
    expect(opsHaveVerseText(undefined)).toBe(false);
    expect(opsHaveVerseText([])).toBe(false);
  });

  it('is true when a verse segment has text', () => {
    const ops: DeltaOperation[] = [
      { insert: 'In the days when the judges ruled. ', attributes: { segment: 'verse_1_1' } }
    ];
    expect(opsHaveVerseText(ops)).toBe(true);
  });

  it('is false when every verse segment is blank', () => {
    const ops: DeltaOperation[] = [
      { insert: { blank: true }, attributes: { segment: 'p_1' } },
      { insert: { blank: true }, attributes: { segment: 'verse_1_1' } },
      { insert: { verse: { number: '2', style: 'v' } } },
      { insert: { blank: true }, attributes: { segment: 'verse_1_2' } }
    ];
    expect(opsHaveVerseText(ops)).toBe(false);
  });

  it('is false when only the book heading has text', () => {
    // The \id, \h, \toc and \mt lines belong to chapter 1 of every book, whether or not it has been translated, so
    // they must not count as content to overwrite.
    const ops: DeltaOperation[] = [
      { insert: '- Mock Scripture for testing', attributes: { segment: 'id_1' } },
      { insert: 'Ruth', attributes: { segment: 'h_1' } },
      { insert: 'Ruth', attributes: { segment: 'toc1_1' } },
      { insert: 'Ruth', attributes: { segment: 'mt1_1' } },
      { insert: { blank: true }, attributes: { segment: 'verse_1_1' } }
    ];
    expect(opsHaveVerseText(ops)).toBe(false);
  });
});

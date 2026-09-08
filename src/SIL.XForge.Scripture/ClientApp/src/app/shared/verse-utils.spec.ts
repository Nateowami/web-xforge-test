import { verseStrCoversVerse } from './verse-utils';

describe('verseStrCoversVerse', () => {
  it('covers the verse itself', () => {
    expect(verseStrCoversVerse('3', '3')).toBe(true);
    expect(verseStrCoversVerse('3', '4')).toBe(false);
    expect(verseStrCoversVerse('3a', '3a')).toBe(true);
  });

  it('covers every verse of a verse bridge', () => {
    expect(verseStrCoversVerse('2-4', '2')).toBe(true);
    expect(verseStrCoversVerse('2-4', '3')).toBe(true);
    expect(verseStrCoversVerse('2-4', '4')).toBe(true);
    expect(verseStrCoversVerse('2-4', '5')).toBe(false);
    expect(verseStrCoversVerse('2b-4a', '3')).toBe(true);
  });

  it('covers every verse of a sequence', () => {
    expect(verseStrCoversVerse('2,5-6', '2')).toBe(true);
    expect(verseStrCoversVerse('2,5-6', '5')).toBe(true);
    expect(verseStrCoversVerse('2,5-6', '4')).toBe(false);
  });

  it('does not cover verses with a letter that is not asked for', () => {
    expect(verseStrCoversVerse('3a', '3')).toBe(false);
    expect(verseStrCoversVerse('3a', '3b')).toBe(false);
  });

  it('does not cover anything when the verse is not a number', () => {
    expect(verseStrCoversVerse('2-4', '')).toBe(false);
    expect(verseStrCoversVerse('2-4', 'a')).toBe(false);
  });
});

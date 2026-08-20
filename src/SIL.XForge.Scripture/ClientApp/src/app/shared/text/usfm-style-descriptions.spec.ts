import { getSegmentStyleDescription } from './usfm-style-descriptions';

describe('getSegmentStyleDescription', () => {
  it('should describe the style of a segment', () => {
    expect(getSegmentStyleDescription('io1_1')).toBe('Introduction - Outline Level 1');
    expect(getSegmentStyleDescription('io2_3')).toBe('Introduction - Outline Level 2');
    expect(getSegmentStyleDescription('iot_1')).toBe('Introduction - Outline Title');
    expect(getSegmentStyleDescription('ip_12')).toBe('Introduction - Paragraph');
    expect(getSegmentStyleDescription('s_1')).toBe('Heading - Section Level 1');
  });

  it('should describe the style of a nested segment', () => {
    expect(getSegmentStyleDescription('verse_1_1/p_1')).toBe('Paragraph - Normal - First Line Indent');
  });

  it('should return undefined for an unknown style', () => {
    expect(getSegmentStyleDescription(undefined)).toBeUndefined();
    expect(getSegmentStyleDescription('verse_1_1')).toBeUndefined();
    expect(getSegmentStyleDescription('not_a_style_1')).toBeUndefined();
  });
});

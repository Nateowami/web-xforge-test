import { ScriptureNode, ScriptureNodeType, ScriptureParagraph, ScriptureText } from '@sillsdev/lynx';
import { ScriptureDeltaDocument } from '@sillsdev/lynx-delta';
import Delta from 'quill-delta';
import { TextDocDocumentFactory } from './text-doc-document-factory';

describe('TextDocDocumentFactory', () => {
  const verseText = 'In the days “when the judges ruled.';
  const textDocDelta = new Delta()
    .insert('RUT - Test', { segment: 'id_1' })
    .insert('\n', { book: { code: 'RUT', style: 'id' } })
    .insert({ chapter: { number: '1', style: 'c' } })
    .insert({ verse: { number: '1', style: 'v' } })
    .insert(verseText, { segment: 'verse_1_1' })
    .insert('\n', { para: { style: 'p' } });

  /** Gets the text doc offset of the verse text, as computed from the Lynx document's nodes. */
  function verseTextOffset(doc: ScriptureDeltaDocument): number {
    const node: ScriptureNode | undefined = [...doc.findNodes(ScriptureNodeType.Text)].find(
      n => (n as ScriptureText).text === verseText
    );
    return doc.offsetAt(node!.range.start);
  }

  it('treats the \\id line as a paragraph', () => {
    const doc = new TextDocDocumentFactory().create('uri', {
      format: 'scripture-delta',
      version: 1,
      content: textDocDelta
    });

    const book = doc.children[0] as ScriptureParagraph;
    expect(book.type).toBe(ScriptureNodeType.Paragraph);
    expect(book.style).toBe('id');
    // Offsets are unchanged: 'RUT - Test\n' + chapter + verse
    expect(verseTextOffset(doc)).toBe(13);
  });

  it('keeps offsets in step with the text doc when the \\id text is edited', () => {
    const factory = new TextDocDocumentFactory();
    const doc = factory.create('uri', { format: 'scripture-delta', version: 1, content: textDocDelta });

    factory.update(doc, { version: 2, contentChanges: new Delta().retain(3).insert('XYZ', { segment: 'id_1' }).ops });
    expect(verseTextOffset(doc)).toBe(16);

    factory.update(doc, { version: 3, contentChanges: new Delta().retain(1).delete(8).ops });
    expect(verseTextOffset(doc)).toBe(8);
  });

  it('keeps the paragraph style when the \\id line becomes an ordinary paragraph', () => {
    const factory = new TextDocDocumentFactory();
    const doc = factory.create('uri', { format: 'scripture-delta', version: 1, content: textDocDelta });

    factory.update(doc, {
      version: 2,
      contentChanges: new Delta().retain(10).retain(1, { book: null, para: { style: 'mt1' } }).ops
    });

    // Not 'p', which is what Lynx makes of a newline that has lost its para attribute
    const para = doc.children[0] as ScriptureParagraph;
    expect(para.type).toBe(ScriptureNodeType.Paragraph);
    expect(para.style).toBe('mt1');
    expect(verseTextOffset(doc)).toBe(13);
  });

  it('removes the \\id paragraph style when the book attribute is removed', () => {
    const factory = new TextDocDocumentFactory();
    const doc = factory.create('uri', { format: 'scripture-delta', version: 1, content: textDocDelta });

    factory.update(doc, { version: 2, contentChanges: new Delta().retain(10).retain(1, { book: null }).ops });

    // Lynx treats a newline without attributes as an implicit 'p' paragraph
    expect([...doc.findNodes(ScriptureNodeType.Paragraph)].map(n => (n as ScriptureParagraph).style)).toEqual([
      'p',
      'p'
    ]);
    expect(verseTextOffset(doc)).toBe(13);
  });

  it('accepts content as a JSON string', () => {
    const doc = new TextDocDocumentFactory().create('uri', {
      format: 'scripture-delta',
      version: 1,
      content: JSON.stringify(textDocDelta.ops)
    });

    expect((doc.children[0] as ScriptureParagraph).style).toBe('id');
    expect(verseTextOffset(doc)).toBe(13);
  });
});

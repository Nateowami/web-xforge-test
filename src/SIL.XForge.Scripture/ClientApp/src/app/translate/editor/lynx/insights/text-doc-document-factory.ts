import { DocumentChanges, DocumentData } from '@sillsdev/lynx';
import { ScriptureDeltaDocument, ScriptureDeltaDocumentFactory } from '@sillsdev/lynx-delta';
import Delta, { Op } from 'quill-delta';

/**
 * Creates and updates the Lynx documents for SF text docs.
 *
 * A text doc stores the book's \id line as a newline with a `book` attribute, but Lynx's
 * {@link ScriptureDeltaDocument} only recognizes the `para` attribute as the end of a block. It therefore merges the
 * \id line into the chapter's first line, and an edit to the \id text corrupts the document's line offsets, which
 * displaces every insight after it by the length of the \id line. Lynx is given the \id line as a paragraph instead.
 * The rename preserves the length of every op, so offsets in the Lynx document still match the text doc.
 *
 * TODO: Remove this class once `ScriptureDeltaDocument` in @sillsdev/lynx-delta handles the `book` attribute itself
 * (as a `ScriptureBook` node). Until then Lynx reports the \id line as a paragraph with style `id`, not a book node.
 */
export class TextDocDocumentFactory extends ScriptureDeltaDocumentFactory {
  create(uri: string, data: DocumentData<Delta | string>): ScriptureDeltaDocument {
    const content: Delta = typeof data.content === 'string' ? new Delta(JSON.parse(data.content)) : data.content;
    return super.create(uri, { ...data, content: new Delta(content.ops.map(bookToPara)) });
  }

  update(document: ScriptureDeltaDocument, changes: DocumentChanges<Op>): ScriptureDeltaDocument {
    return super.update(document, { ...changes, contentChanges: changes.contentChanges.map(bookToPara) });
  }
}

function bookToPara(op: Op): Op {
  // Also rename a removal of the attribute ({ book: null }), so that it removes the renamed attribute
  if (op.attributes == null || !('book' in op.attributes)) {
    return op;
  }
  const { book, ...attributes } = op.attributes;
  // When one attribute is removed and the other is set, as when the \id line becomes an ordinary paragraph
  // ({ book: null, para: X }), keep the one that is set
  return { ...op, attributes: { ...attributes, para: attributes.para ?? book } };
}

import { Blot } from 'parchment';
import { Bounds } from 'quill';
import QuillCursors from 'quill-cursors';

/**
 * Characters that are laid out left-to-right even when they appear in right-to-left text: decimal
 * digits (European and Arabic-Indic alike) and left-to-right scripts.
 */
const LTR_ORDERED_CHAR = /[\p{Nd}\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u;

/** The private quill-cursors method that this module corrects. */
interface CursorBoundsAdjuster {
  _adjustBoundsForRtl(bounds: Bounds, leaf: [Blot, number]): Bounds;
}

/**
 * The viewport x coordinate for a caret at {@link offset} within a text node that is laid out
 * right-to-left.
 */
export function getRtlCaretX(node: Text, offset: number): number {
  // Measure the character the caret is in front of, or the last character if the caret is at the end
  // of the node.
  const atEndOfNode: boolean = offset >= node.data.length;
  const index: number = atEndOfNode ? node.data.length - 1 : offset;
  const range: Range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);
  const rect: DOMRect = range.getBoundingClientRect();

  // Right-to-left characters begin on their right edge and end on their left edge. Digits and Latin
  // text keep their left-to-right order even when surrounded by right-to-left characters, so they
  // are the other way around.
  const isLtrChar: boolean = LTR_ORDERED_CHAR.test(node.data[index]);
  if (atEndOfNode) {
    return isLtrChar ? rect.right : rect.left;
  }
  return isLtrChar ? rect.left : rect.right;
}

/**
 * quill-cursors picks the side of a character to draw a caret on from the direction of the enclosing
 * element, so in right-to-left text it draws the caret on the wrong side of anything that is laid out
 * left-to-right: after a user types "123" at the end of an Arabic verse, collaborators see that
 * user's cursor between the "2" and the "3". Take the side from the character itself instead.
 */
export class FixBidiCaretCursors extends QuillCursors {}

(FixBidiCaretCursors.prototype as unknown as CursorBoundsAdjuster)._adjustBoundsForRtl = function (
  this: QuillCursors,
  bounds: Bounds,
  leaf: [Blot, number]
): Bounds {
  const [blot, offset] = leaf;
  const node: Node = blot.domNode;
  if (!(node instanceof Text) || node.data.length === 0) {
    return bounds;
  }
  const containerRect: DOMRect = this.quill.container.getBoundingClientRect();
  return { ...bounds, left: getRtlCaretX(node, offset) - containerRect.left };
};

import { getRtlCaretX } from './quill-cursors';

describe('getRtlCaretX', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.direction = 'rtl';
    container.style.fontSize = '16px';
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  function textNode(text: string): Text {
    container.textContent = text;
    return container.firstChild as Text;
  }

  /** The rect of a range of characters within the node, in viewport coordinates. */
  function rectOf(node: Text, start: number, end: number): DOMRect {
    const range: Range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    return range.getBoundingClientRect();
  }

  it('puts the caret after the last digit of a number, not inside it', () => {
    const node: Text = textNode('م123');

    expect(getRtlCaretX(node, 4)).toEqual(rectOf(node, 1, 4).right);
  });

  it('puts the caret before the first digit of a number', () => {
    const node: Text = textNode('123م');

    expect(getRtlCaretX(node, 0)).toEqual(rectOf(node, 0, 3).left);
  });

  it('puts the caret on the left of a right-to-left character at the end of the node', () => {
    const node: Text = textNode('من');

    expect(getRtlCaretX(node, 2)).toEqual(rectOf(node, 1, 2).left);
  });

  it('puts the caret on the right of a right-to-left character at the start of the node', () => {
    const node: Text = textNode('من');

    expect(getRtlCaretX(node, 0)).toEqual(rectOf(node, 0, 1).right);
  });
});

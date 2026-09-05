/**
 * Checks if two string arrays have identical content.
 */
export function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Removes html tags from a string while preserving the text content, including text that is written as a character
 * reference such as `&lt;`, `&gt;` or `&amp;`.
 * @param content The string with possible HTML tags to process.
 * @returns The string with all tags removed and character references resolved.
 */
export function stripHtml(content: string): string {
  if (content == null) {
    return '';
  }

  // Skip processing if there are no tags or character references
  if (!/[<>&]/.test(content)) {
    return content;
  }

  // Use 'text/html' to avoid parsing errors with 'text/xml', as it is more lenient
  const doc: Document = new DOMParser().parseFromString(content, 'text/html');

  // Angle brackets that survive parsing are text the user intended, so they are kept
  return doc.documentElement.textContent || '';
}

/**
 * Checks if a string is whitespace or empty.
 * @param text The string to check.
 * @returns True if the string is empty or contains only whitespace characters, false otherwise.
 * Nullish values are treated as false.
 */
export function isWhitespace(text: string): boolean {
  if (text == null) {
    return false;
  }

  if (text.length === 0) {
    return true;
  }

  return /^\s*$/.test(text);
}

/**
 * The supported types for a search field.
 * - 'text': the field accepts any string value (quoted or unquoted)
 * - 'boolean': the field accepts only the literal strings "true" or "false"
 * - 'date': the field accepts an ISO 8601 date string (e.g. "2025-01-15")
 */
export type SearchFieldType = 'text' | 'boolean' | 'date';

/** Definition of a single searchable field */
export interface SearchFieldDef {
  id: string;
  label: string;
  type: SearchFieldType;
  /** Optional longer description of what this field filters */
  description?: string;
}

/** Definition of the complete set of fields available for searching */
export interface SearchFieldsDef {
  fields: SearchFieldDef[];
}

/** A single parsed search term (one field:value pair) */
export interface ParsedSearchTerm {
  fieldId: string;
  value: string | boolean;
}

/** A parse error, including the position in the input string where it occurred */
export interface ParseError {
  message: string;
  /** Zero-based character index in the input string where the error begins */
  position: number;
}

/** The result of parsing a search query string */
export interface ParsedSearchQuery {
  /** The successfully parsed terms */
  terms: ParsedSearchTerm[];
  /** True when there are no parse errors */
  isValid: boolean;
  /** List of parse errors; empty when isValid is true */
  errors: ParseError[];
}

/**
 * Parses a search query string into a structured list of field:value terms.
 *
 * Format: space-separated terms of the form `fieldId:value` or `fieldId:"quoted value"`.
 * Double-quote characters inside a quoted value can be escaped by doubling them (`""`).
 *
 * Examples:
 *   name:"My Project"            — text field with a quoted multi-word value
 *   shortName:FOO                — text field with an unquoted single-word value
 *   drafting:true                — boolean field
 *   name:"My Project" drafting:false   — multiple terms (implicitly ANDed)
 *
 * The function validates:
 *   - that every field ID is present in `fieldsDef`
 *   - that boolean fields have exactly "true" or "false" as their value
 *   - that quoted strings are properly closed
 *   - that every term includes both a field ID and a value (no bare words)
 */
export function parseSearchQuery(input: string, fieldsDef: SearchFieldsDef): ParsedSearchQuery {
  const terms: ParsedSearchTerm[] = [];
  const errors: ParseError[] = [];

  // Build a fast lookup map from field ID to definition.
  const fieldMap = new Map<string, SearchFieldDef>();
  for (const field of fieldsDef.fields) {
    fieldMap.set(field.id, field);
  }

  let charIndex = 0;

  while (charIndex < input.length) {
    // Skip leading whitespace.
    while (charIndex < input.length && /\s/.test(input[charIndex])) {
      charIndex++;
    }
    if (charIndex >= input.length) break;

    const termStart = charIndex;

    // Read the field ID — everything up to ':' or whitespace.
    let fieldId = '';
    while (charIndex < input.length && input[charIndex] !== ':' && !/\s/.test(input[charIndex])) {
      fieldId += input[charIndex];
      charIndex++;
    }

    if (fieldId.length === 0) {
      // This can happen if the input begins with ':'.
      errors.push({
        message: `Expected a field name at position ${termStart + 1}, but found '${input[termStart]}'`,
        position: termStart
      });
      // Skip until the next whitespace so we can continue parsing.
      while (charIndex < input.length && !/\s/.test(input[charIndex])) charIndex++;
      continue;
    }

    if (charIndex >= input.length || input[charIndex] !== ':') {
      // A word without ':' — the user forgot to specify a value.
      errors.push({
        message: `Expected ':' after field name "${fieldId}" (use the format ${fieldId}:value or ${fieldId}:"quoted value")`,
        position: charIndex
      });
      // We already consumed all non-whitespace, so move on to the next term.
      continue;
    }

    // Consume the ':'.
    charIndex++;

    if (charIndex >= input.length || /\s/.test(input[charIndex])) {
      // There is nothing after the colon.
      errors.push({
        message: `Expected a value after "${fieldId}:" — for example, ${fieldId}:someValue`,
        position: charIndex
      });
      continue;
    }

    // Read the value — either a quoted string or an unquoted word.
    let value: string;
    const valueStart = charIndex;

    if (input[charIndex] === '"') {
      charIndex++; // skip the opening quote
      let quotedValue = '';
      let closed = false;

      while (charIndex < input.length) {
        if (input[charIndex] === '"') {
          if (charIndex + 1 < input.length && input[charIndex + 1] === '"') {
            // Escaped double-quote ("").
            quotedValue += '"';
            charIndex += 2;
          } else {
            // Closing quote.
            closed = true;
            charIndex++;
            break;
          }
        } else {
          quotedValue += input[charIndex];
          charIndex++;
        }
      }

      if (!closed) {
        errors.push({
          message: `Unclosed quote for field "${fieldId}": the value starting at position ${valueStart + 1} was never closed`,
          position: valueStart
        });
        // Use whatever we managed to read so far for type-checking.
        value = quotedValue;
      } else {
        value = quotedValue;
      }
    } else {
      // Unquoted: read until whitespace.
      let unquotedValue = '';
      while (charIndex < input.length && !/\s/.test(input[charIndex])) {
        unquotedValue += input[charIndex];
        charIndex++;
      }
      value = unquotedValue;
    }

    // Validate the field ID against the definition.
    const fieldDef = fieldMap.get(fieldId);
    if (fieldDef == null) {
      const availableFieldIds: string = fieldsDef.fields.map(f => f.id).join(', ');
      errors.push({
        message:
          fieldsDef.fields.length === 0
            ? `Unknown field "${fieldId}": no fields are defined`
            : `Unknown field "${fieldId}". Available fields: ${availableFieldIds}`,
        position: termStart
      });
      continue;
    }

    // Validate and convert the value according to the field type.
    if (fieldDef.type === 'boolean') {
      if (value === 'true') {
        terms.push({ fieldId, value: true });
      } else if (value === 'false') {
        terms.push({ fieldId, value: false });
      } else {
        errors.push({
          message: `Field "${fieldId}" is a boolean field and must be "true" or "false", but got "${value}"`,
          position: valueStart
        });
      }
    } else if (fieldDef.type === 'date') {
      // Accept any string that Date.parse can interpret as a valid date.
      const dateMs = Date.parse(value);
      if (Number.isNaN(dateMs)) {
        errors.push({
          message: `Field "${fieldId}" expects a date in ISO format (e.g. 2025-01-15), but "${value}" is not a valid date`,
          position: valueStart
        });
      } else {
        terms.push({ fieldId, value });
      }
    } else {
      // text type — any non-empty string is valid.
      terms.push({ fieldId, value });
    }
  }

  return {
    terms,
    isValid: errors.length === 0,
    errors
  };
}

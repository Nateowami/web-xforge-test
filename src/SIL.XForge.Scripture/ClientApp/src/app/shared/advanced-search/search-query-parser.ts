/** The supported types for a search field */
export type SearchFieldType = 'text' | 'boolean';

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

  let i = 0;

  while (i < input.length) {
    // Skip leading whitespace.
    while (i < input.length && /\s/.test(input[i])) {
      i++;
    }
    if (i >= input.length) break;

    const termStart = i;

    // Read the field ID — everything up to ':' or whitespace.
    let fieldId = '';
    while (i < input.length && input[i] !== ':' && !/\s/.test(input[i])) {
      fieldId += input[i];
      i++;
    }

    if (fieldId.length === 0) {
      // This can happen if the input begins with ':'.
      errors.push({
        message: `Expected a field name at position ${termStart + 1}, but found '${input[termStart]}'`,
        position: termStart
      });
      // Skip until the next whitespace so we can continue parsing.
      while (i < input.length && !/\s/.test(input[i])) i++;
      continue;
    }

    if (i >= input.length || input[i] !== ':') {
      // A word without ':' — the user forgot to specify a value.
      errors.push({
        message: `Expected ':' after field name "${fieldId}" (use the format ${fieldId}:value or ${fieldId}:"quoted value")`,
        position: i
      });
      // We already consumed all non-whitespace, so move on to the next term.
      continue;
    }

    // Consume the ':'.
    i++;

    if (i >= input.length || /\s/.test(input[i])) {
      // There is nothing after the colon.
      errors.push({
        message: `Expected a value after "${fieldId}:" — for example, ${fieldId}:someValue`,
        position: i
      });
      continue;
    }

    // Read the value — either a quoted string or an unquoted word.
    let value: string;
    const valueStart = i;

    if (input[i] === '"') {
      i++; // skip the opening quote
      let quotedValue = '';
      let closed = false;

      while (i < input.length) {
        if (input[i] === '"') {
          if (i + 1 < input.length && input[i + 1] === '"') {
            // Escaped double-quote ("").
            quotedValue += '"';
            i += 2;
          } else {
            // Closing quote.
            closed = true;
            i++;
            break;
          }
        } else {
          quotedValue += input[i];
          i++;
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
      while (i < input.length && !/\s/.test(input[i])) {
        unquotedValue += input[i];
        i++;
      }
      value = unquotedValue;
    }

    // Validate the field ID against the definition.
    const fieldDef = fieldMap.get(fieldId);
    if (fieldDef == null) {
      const knownIds: string = fieldsDef.fields.map(f => f.id).join(', ');
      errors.push({
        message:
          fieldsDef.fields.length === 0
            ? `Unknown field "${fieldId}": no fields are defined`
            : `Unknown field "${fieldId}". Available fields: ${knownIds}`,
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

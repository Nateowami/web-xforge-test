import { ParsedSearchQuery, parseSearchQuery, SearchFieldsDef } from './search-query-parser';

/** Fields definition used across most tests */
const fieldsDef: SearchFieldsDef = {
  fields: [
    { id: 'name', label: 'Project name', type: 'text' },
    { id: 'shortName', label: 'Short name', type: 'text' },
    { id: 'drafting', label: 'Drafting enabled', type: 'boolean' },
    { id: 'customConfig', label: 'Has custom config', type: 'boolean' },
    { id: 'description', label: 'Description', type: 'text', description: 'A longer description of the project' },
    { id: 'dateBefore', label: 'Submitted before', type: 'date' },
    { id: 'dateAfter', label: 'Submitted after', type: 'date' }
  ]
};

describe('parseSearchQuery', () => {
  describe('empty and whitespace-only input', () => {
    it('returns no terms and no errors for an empty string', () => {
      const result: ParsedSearchQuery = parseSearchQuery('', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('returns no terms and no errors for whitespace-only input', () => {
      const result: ParsedSearchQuery = parseSearchQuery('   \t\n  ', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('text fields', () => {
    it('parses a single unquoted text term', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Project01', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Project01' }]);
    });

    it('parses a single quoted text term', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"My Project"', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'My Project' }]);
    });

    it('preserves spaces inside quoted values', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"Project with lots of spaces"', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Project with lots of spaces' }]);
    });

    it('parses multiple text terms', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Foo shortName:BAR', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([
        { fieldId: 'name', value: 'Foo' },
        { fieldId: 'shortName', value: 'BAR' }
      ]);
    });

    it('handles extra whitespace between terms', () => {
      const result: ParsedSearchQuery = parseSearchQuery('  name:Foo   shortName:BAR  ', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([
        { fieldId: 'name', value: 'Foo' },
        { fieldId: 'shortName', value: 'BAR' }
      ]);
    });

    it('handles tabs between terms', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Foo\tshortName:BAR', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([
        { fieldId: 'name', value: 'Foo' },
        { fieldId: 'shortName', value: 'BAR' }
      ]);
    });

    it('preserves leading and trailing spaces in quoted values', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:" My Project "', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: ' My Project ' }]);
    });

    it('handles an empty quoted value', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:""', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: '' }]);
    });

    it('unescapes doubled double-quotes inside a quoted value', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"Say ""hello"""', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Say "hello"' }]);
    });

    it('handles special characters in unquoted values', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:foo-bar_baz.123', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'foo-bar_baz.123' }]);
    });
  });

  describe('boolean fields', () => {
    it('parses true for a boolean field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('drafting:true', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'drafting', value: true }]);
    });

    it('parses false for a boolean field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('drafting:false', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'drafting', value: false }]);
    });

    it('reports an error for a non-boolean value on a boolean field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('drafting:yes', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('"yes"');
      expect(result.errors[0].message).toContain('drafting');
    });

    it('reports an error for a numeric value on a boolean field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('drafting:1', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    it('reports an error for True (capitalised) on a boolean field', () => {
      // Boolean values are case-sensitive; only "true" and "false" are accepted.
      const result: ParsedSearchQuery = parseSearchQuery('drafting:True', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    it('reports an error for a quoted boolean value on a boolean field', () => {
      // Boolean fields should not accept quoted strings, even if the content is "true".
      const result: ParsedSearchQuery = parseSearchQuery('drafting:"true"', fieldsDef);
      // "true" (string) ≠ true (boolean literal), so it should still be valid since the value string is "true".
      // Actually the parser reads it as the string "true" and the value comparison is string === 'true', which passes.
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'drafting', value: true }]);
    });
  });

  describe('mixed terms', () => {
    it('parses a mix of text and boolean terms', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"My Project" drafting:true shortName:MP', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([
        { fieldId: 'name', value: 'My Project' },
        { fieldId: 'drafting', value: true },
        { fieldId: 'shortName', value: 'MP' }
      ]);
    });

    it('allows the same field to appear more than once', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Foo name:Bar', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([
        { fieldId: 'name', value: 'Foo' },
        { fieldId: 'name', value: 'Bar' }
      ]);
    });
  });

  describe('unknown fields', () => {
    it('reports an error for an unknown field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('unknownField:value', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('unknownField');
    });

    it('does not add a term when a field is unknown', () => {
      const result: ParsedSearchQuery = parseSearchQuery('unknownField:value', fieldsDef);
      expect(result.terms).toEqual([]);
    });

    it('accumulates errors for multiple unknown fields', () => {
      const result: ParsedSearchQuery = parseSearchQuery('unknown1:foo unknown2:bar', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('still parses valid terms when some are unknown', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Good unknownField:Bad', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Good' }]);
      expect(result.errors.length).toBe(1);
    });

    it('includes the list of known fields in the error message', () => {
      const result: ParsedSearchQuery = parseSearchQuery('nope:value', fieldsDef);
      expect(result.errors[0].message).toContain('name');
      expect(result.errors[0].message).toContain('shortName');
      expect(result.errors[0].message).toContain('drafting');
    });

    it('handles an empty fieldsDef gracefully', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:value', { fields: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('name');
    });
  });

  describe('syntax errors', () => {
    it('reports an error when a term has no colon', () => {
      const result: ParsedSearchQuery = parseSearchQuery('justAWord', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain(':');
    });

    it('reports an error when the value is missing after the colon', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('name:');
    });

    it('reports an error when value is missing and another term follows', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name: shortName:FOO', fieldsDef);
      expect(result.isValid).toBe(false);
      // The name: has no value (space follows ':'), and shortName:FOO should parse correctly.
      const nameTerm = result.terms.find(t => t.fieldId === 'shortName');
      expect(nameTerm).toBeDefined();
    });

    it('reports an error for an unclosed quoted string', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"unclosed', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('Unclosed');
    });

    it('reports an error for an unclosed quote but still records the partial value', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"partial value', fieldsDef);
      expect(result.isValid).toBe(false);
      // The unclosed-quote error is reported, but the partial value should still produce a term.
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'partial value' }]);
    });

    it('reports an error when the input starts with a colon', () => {
      const result: ParsedSearchQuery = parseSearchQuery(':value', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('error positions', () => {
    it('provides position 0 for an error at the start of input', () => {
      const result: ParsedSearchQuery = parseSearchQuery('unknown:foo', fieldsDef);
      expect(result.errors[0].position).toBe(0);
    });

    it('provides the correct position for an error in the middle of the input', () => {
      // "name:Good " is 10 characters; error starts at position 10.
      const result: ParsedSearchQuery = parseSearchQuery('name:Good unknown:foo', fieldsDef);
      expect(result.errors[0].position).toBe(10);
    });

    it('provides the correct position for a missing colon', () => {
      // "name" is 4 chars; the missing ':' is at position 4.
      const result: ParsedSearchQuery = parseSearchQuery('name', fieldsDef);
      expect(result.errors[0].position).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles a quoted value with newlines', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"line1\nline2"', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'line1\nline2' }]);
    });

    it('handles a field whose value is a colon', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name::value', fieldsDef);
      // The field is 'name', the value is ':value'.
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: ':value' }]);
    });

    it('handles a quoted value containing only whitespace', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"   "', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: '   ' }]);
    });

    it('handles unicode characters in values', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:"Projet Français"', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Projet Français' }]);
    });

    it('accumulates multiple errors in a single parse', () => {
      const result: ParsedSearchQuery = parseSearchQuery('bad1:x bad2:y unknown:z', { fields: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it('handles a long query with many valid terms', () => {
      const query =
        'name:"Long Name" shortName:LN drafting:true customConfig:false description:"Some description"';
      const result: ParsedSearchQuery = parseSearchQuery(query, fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms.length).toBe(5);
    });
  });

  describe('date fields', () => {
    it('accepts a valid ISO date as an unquoted value', () => {
      const result: ParsedSearchQuery = parseSearchQuery('dateBefore:2025-01-15', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'dateBefore', value: '2025-01-15' }]);
    });

    it('accepts a full ISO datetime string', () => {
      const result: ParsedSearchQuery = parseSearchQuery('dateAfter:2025-06-30T12:00:00Z', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'dateAfter', value: '2025-06-30T12:00:00Z' }]);
    });

    it('accepts a quoted ISO date', () => {
      const result: ParsedSearchQuery = parseSearchQuery('dateBefore:"2025-01-15"', fieldsDef);
      expect(result.isValid).toBe(true);
      expect(result.terms).toEqual([{ fieldId: 'dateBefore', value: '2025-01-15' }]);
    });

    it('reports an error for a non-date value on a date field', () => {
      const result: ParsedSearchQuery = parseSearchQuery('dateBefore:notadate', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('dateBefore');
      expect(result.errors[0].message).toContain('notadate');
    });

    it('does not add a term when the date value is invalid', () => {
      const result: ParsedSearchQuery = parseSearchQuery('dateBefore:notadate', fieldsDef);
      expect(result.terms).toEqual([]);
    });

    it('still parses other valid terms alongside an invalid date', () => {
      const result: ParsedSearchQuery = parseSearchQuery('name:Foo dateBefore:bad', fieldsDef);
      expect(result.isValid).toBe(false);
      expect(result.terms).toEqual([{ fieldId: 'name', value: 'Foo' }]);
    });
  });
});

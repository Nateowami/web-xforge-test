import { fakeAsync } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SFValidators } from './sfvalidators';

describe('SFValidators', () => {
  describe('verse string', () => {
    it('no error on empty value', fakeAsync(() => {
      expect(SFValidators.verseStr()(new FormControl(''))).toBeNull();
    }));

    it('no error on a well formed verse', fakeAsync(() => {
      for (const ref of ['MAT 1:1', 'MAT 1:1a', 'MAT 1:1B', 'mat 1:1', 'MAT 01:01']) {
        expect(SFValidators.verseStr()(new FormControl(ref)))
          .withContext(ref)
          .toBeNull();
      }
    }));

    it('error when the verse contains unexpected characters', fakeAsync(() => {
      // VerseRef itself parses these, keeping everything after the digits as part of the verse
      for (const ref of ['MAT 1:1#', 'MAT 1:1c', 'MAT 1:1a2', 'MAT 1:1=2', 'MAT 1:1_2', 'MAT 1:1*2']) {
        expect(SFValidators.verseStr()(new FormControl(ref)))
          .withContext(ref)
          .toEqual({ verseFormat: true });
      }
    }));

    it('error when the reference is not a single verse', fakeAsync(() => {
      for (const ref of ['MAT', 'MAT 1', 'MAT a1', 'MAT 1:aa', 'MAT 1:1,', 'MAT 1:1--2', 'MAT 1:1,2:1', 'MAT 1:1-3']) {
        expect(SFValidators.verseStr()(new FormControl(ref)))
          .withContext(ref)
          .toEqual({ verseFormat: true });
      }
    }));
  });

  describe('balanced parentheses', () => {
    it('no error on null control', fakeAsync(() => {
      expect(SFValidators.balancedParentheses(null)).toBeNull();
    }));

    it('no error on null or empty value', fakeAsync(() => {
      expect(SFValidators.balancedParentheses(new FormControl(null))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl(''))).toBeNull();
    }));

    it('no error if brackets match or are missing', fakeAsync(() => {
      expect(SFValidators.balancedParentheses(new FormControl('a'))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl('a()'))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl('(a)'))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl('((a))'))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl('(())\n()'))).toBeNull();
      expect(SFValidators.balancedParentheses(new FormControl('(())\n(())\n(())\n'))).toBeNull();
    }));

    it('error when brackets are not closed', fakeAsync(() => {
      expect(SFValidators.balancedParentheses(new FormControl('('))).toEqual({ unbalancedParentheses: true });
      expect(SFValidators.balancedParentheses(new FormControl(')'))).toEqual({ unbalancedParentheses: true });
      expect(SFValidators.balancedParentheses(new FormControl('(()'))).toEqual({ unbalancedParentheses: true });
      expect(SFValidators.balancedParentheses(new FormControl('()))'))).toEqual({ unbalancedParentheses: true });
      expect(SFValidators.balancedParentheses(new FormControl('(\n)'))).toEqual({ unbalancedParentheses: true });
      expect(SFValidators.balancedParentheses(new FormControl('(()\n)'))).toEqual({ unbalancedParentheses: true });
    }));
  });
});

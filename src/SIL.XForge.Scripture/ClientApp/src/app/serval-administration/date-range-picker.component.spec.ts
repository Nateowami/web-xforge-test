import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { I18nService } from 'xforge-common/i18n.service';
import { Locale } from 'xforge-common/models/i18n-locale';
import { DateRangePickerComponent } from './date-range-picker.component';

describe('DateRangePickerComponent', () => {
  it('should initialize with default date range', () => {
    const env = new TestEnvironment();
    env.fixture.detectChanges();
    const formValue = env.component.dateRangeForm.value;
    expect(formValue.start).toBeTruthy();
    expect(formValue.end).toBeTruthy();
    expect(formValue.start!.getTime()).toBeLessThan(formValue.end!.getTime());
  });

  it('can initiate with an empty range when set', () => {
    const env = new TestEnvironment({ startWithEmptyRange: true });
    env.component.showReset = true;
    env.fixture.detectChanges();

    const initialFormValue = env.component.dateRangeForm.value;
    expect(initialFormValue.start).toBeNull();
    expect(initialFormValue.end).toBeNull();
    // Initialization with an empty range does not tell the parent about a range.
    expect(env.emitSpy).not.toHaveBeenCalled();
    expect(env.component.isDefaultRange).toBe(true);

    const endDate = new Date(env.component.maxSelectableDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    env.component.dateRangeForm.setValue({ start: startDate, end: endDate });
    env.fixture.detectChanges();
    // The range has been updated
    expect(env.emitSpy).toHaveBeenCalled();
    expect(env.component.isDefaultRange).toBe(false);

    // Clear the range
    expect(env.component.showReset).toBe(true);
    const clearButton = env.fixture.nativeElement.querySelector('[data-test-id="reset-button"]');
    clearButton.click();
    env.fixture.detectChanges();
    // Clearing the range tells the parent that no range is in effect.
    expect(env.emitSpy).toHaveBeenCalledWith(/* nothing */);
    expect(env.component.dateRangeForm.value).toEqual({ start: null, end: null });
    expect(env.component.isDefaultRange).toBe(true);
  });

  it('should not emit undefined for a range if the default is defined', () => {
    const env = new TestEnvironment({ startWithEmptyRange: false });
    env.component.showReset = true;
    env.fixture.detectChanges();

    const initialFormValue = env.component.dateRangeForm.value;
    expect(initialFormValue.start).not.toBeNull();
    expect(initialFormValue.end).not.toBeNull();
    // Initialization tells the parent about the default range.
    expect(env.emitSpy).toHaveBeenCalledTimes(1);
    expect(env.emitSpy).toHaveBeenCalledWith({ start: initialFormValue.start!, end: initialFormValue.end! });
    expect(env.component.isDefaultRange).toBe(true);

    env.emitSpy.calls.reset();
    env.component.dateRangeForm.setValue({ start: null, end: null });
    env.fixture.detectChanges();
    // If the default range is defined, the date range picker should not consider a null range as valid
    expect(env.emitSpy).not.toHaveBeenCalled();
    expect(env.component.isDefaultRange).toBe(true);
  });

  describe('incomplete range error', () => {
    it('shows an error when the start date is erased and the user leaves the control', () => {
      const env = new TestEnvironment({ startWithEmptyRange: true });
      env.setRange(env.daysAgo(5), env.daysAgo(1));
      expect(env.errorText).toBeNull();

      env.typeInto(env.startInput, '');
      // Still composing
      expect(env.errorText).toBeNull();
      env.moveFocus(env.startInput, env.endInput);
      // Moving between the start and end inputs is still composing
      expect(env.component.dateRangeForm.controls.start.touched).toBe(true);
      expect(env.component.isIncompleteRangeLeft).toBe(false);
      expect(env.errorText).toBeNull();
      env.blur(env.endInput);

      expect(env.component.isIncompleteRangeLeft).toBe(true);
      expect(env.errorText).toContain('Select a valid date range');
      expect(env.formField.classList).toContain('mat-form-field-invalid');

      // Completing the range clears the error
      env.typeInto(env.startInput, env.formatDate(env.daysAgo(3)));
      env.blur(env.startInput);
      expect(env.errorText).toBeNull();
    });

    it('shows an error when only the start date is filled in and the user leaves the control', () => {
      const env = new TestEnvironment({ startWithEmptyRange: true });
      env.typeInto(env.startInput, env.formatDate(env.daysAgo(3)));
      env.blur(env.startInput);

      expect(env.errorText).toContain('Select a valid date range');
    });

    it('does not show an error for an empty range when empty is the default', () => {
      const env = new TestEnvironment({ startWithEmptyRange: true });
      env.setRange(env.daysAgo(5), env.daysAgo(1));
      env.typeInto(env.startInput, '');
      env.typeInto(env.endInput, '');
      env.blur(env.endInput);

      expect(env.component.isIncompleteRangeLeft).toBe(false);
      expect(env.errorText).toBeNull();
    });

    it('shows an error for an empty range when there is a default range', () => {
      const env = new TestEnvironment({ startWithEmptyRange: false });
      env.typeInto(env.startInput, '');
      env.typeInto(env.endInput, '');
      env.blur(env.endInput);

      expect(env.errorText).toContain('Select a valid date range');
    });

    it('does not show an error while the calendar popup is open', fakeAsync(() => {
      const env = new TestEnvironment({ startWithEmptyRange: false });
      env.picker.open();
      env.fixture.detectChanges();
      // Picking a start date in the calendar leaves the end date empty and marks the inputs touched
      env.component.dateRangeForm.setValue({ start: env.daysAgo(3), end: null });
      env.component.dateRangeForm.markAllAsTouched();
      env.fixture.detectChanges();
      expect(env.errorText).toBeNull();

      env.picker.close();
      flush();
      env.fixture.detectChanges();
      expect(env.picker.opened).toBe(false);
      expect(env.errorText).toContain('Select a valid date range');
    }));

    it('does not show an error for an untouched control', () => {
      const env = new TestEnvironment({ startWithEmptyRange: false });
      env.component.dateRangeForm.setValue({ start: null, end: env.daysAgo(1) });
      env.fixture.detectChanges();

      expect(env.component.isIncompleteRangeLeft).toBe(false);
      expect(env.errorText).toBeNull();
    });
  });

  it('should disable future dates', () => {
    const env = new TestEnvironment();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    expect(env.component.disableFutureDates(today)).toBe(true);
    expect(env.component.disableFutureDates(tomorrow)).toBe(false);
  });

  it('should show format hint for locale', () => {
    const env = new TestEnvironment();
    env.fixture.detectChanges();
    expect(env.component.dateRangeFormatHint).toBeDefined();
  });

  describe('date adapter localization', () => {
    it('should mirror i18n locale changes in the date adapter', () => {
      const env = new TestEnvironment();
      const dateAdapter = TestBed.inject(DateAdapter);
      spyOn(dateAdapter, 'setLocale');

      const updatedLocale: Locale = {
        canonicalTag: 'fr',
        direction: 'ltr',
        englishName: 'French',
        localName: 'Français',
        production: true,
        tags: ['fr']
      };

      env.localeSubject.next(updatedLocale);

      expect(dateAdapter.setLocale).toHaveBeenCalledWith('fr');
    });
  });
});

class TestEnvironment {
  readonly localeSubject: BehaviorSubject<Locale>;
  readonly i18nStub: Partial<I18nService>;
  readonly fixture: ComponentFixture<DateRangePickerComponent>;
  readonly component: DateRangePickerComponent;
  readonly emitSpy: jasmine.Spy<DateRangePickerComponent['dateRangeChange']['emit']>;

  constructor({
    startWithEmptyRange = false
  }: {
    startWithEmptyRange?: boolean;
  } = {}) {
    const initialLocale: Locale = {
      canonicalTag: 'en-US',
      direction: 'ltr',
      englishName: 'English',
      localName: 'English',
      production: true,
      tags: ['en-US']
    };

    this.localeSubject = new BehaviorSubject<Locale>(initialLocale);

    this.i18nStub = {
      localeCode: 'en-US',
      locale$: this.localeSubject.asObservable()
    };

    TestBed.configureTestingModule({
      imports: [DateRangePickerComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
      providers: [provideNativeDateAdapter(), FormBuilder, { provide: I18nService, useValue: this.i18nStub }]
    }).compileComponents();

    this.fixture = TestBed.createComponent(DateRangePickerComponent);
    this.component = this.fixture.componentInstance;
    this.component.startWithEmptyRange = startWithEmptyRange;
    // Spy before the first change detection so that emissions from ngOnInit are recorded.
    this.emitSpy = spyOn(this.component.dateRangeChange, 'emit').and.callThrough();
    this.fixture.detectChanges();
  }

  get startInput(): HTMLInputElement {
    return this.fixture.nativeElement.querySelector('input[matStartDate]');
  }

  get endInput(): HTMLInputElement {
    return this.fixture.nativeElement.querySelector('input[matEndDate]');
  }

  get formField(): HTMLElement {
    return this.fixture.nativeElement.querySelector('mat-form-field');
  }

  get errorText(): string | null {
    const errors: HTMLElement[] = Array.from(this.fixture.nativeElement.querySelectorAll('mat-error'));
    return errors.length === 0 ? null : errors.map(e => e.textContent).join(' ');
  }

  daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  /** Formats a date the way the native date adapter parses it for the en-US locale. */
  formatDate(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }

  setRange(start: Date, end: Date): void {
    this.component.dateRangeForm.setValue({ start, end });
    this.fixture.detectChanges();
  }

  typeInto(input: HTMLInputElement, text: string): void {
    this.focus(input);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    this.fixture.detectChanges();
  }

  get picker(): MatDateRangePicker<Date> {
    return this.fixture.debugElement.query(By.directive(MatDateRangePicker)).componentInstance;
  }

  /** Moves focus between the inputs the way a browser does, with the blur event naming where focus is going. */
  moveFocus(from: HTMLInputElement, to: HTMLInputElement): void {
    from.dispatchEvent(new FocusEvent('blur', { relatedTarget: to }));
    this.focus(to);
  }

  focus(input: HTMLInputElement): void {
    input.focus();
    input.dispatchEvent(new FocusEvent('focus'));
    this.fixture.detectChanges();
  }

  blur(input: HTMLInputElement): void {
    input.blur();
    input.dispatchEvent(new FocusEvent('blur'));
    this.fixture.detectChanges();
  }
}

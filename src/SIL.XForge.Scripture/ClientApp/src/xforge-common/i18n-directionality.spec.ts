import { Directionality } from '@angular/cdk/bidi';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { I18nService } from './i18n.service';
import { I18nDirectionality } from './i18n-directionality';
import { Locale } from './models/i18n-locale';

const ltrLocale: Partial<Locale> = { direction: 'ltr' };
const rtlLocale: Partial<Locale> = { direction: 'rtl' };

describe('I18nDirectionality', () => {
  let locale$: BehaviorSubject<Partial<Locale>>;

  function setup(initialLocale: Partial<Locale>): void {
    locale$ = new BehaviorSubject<Partial<Locale>>(initialLocale);
    const mockI18n = {
      get direction() {
        return locale$.value.direction;
      },
      locale$
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: I18nService, useValue: mockI18n },
        { provide: Directionality, useClass: I18nDirectionality }
      ]
    });
  }

  it('should initialize with ltr direction when locale is ltr', () => {
    setup(ltrLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    expect(directionality.value).toBe('ltr');
  });

  it('should initialize with rtl direction when locale is rtl', () => {
    setup(rtlLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    expect(directionality.value).toBe('rtl');
  });

  it('should update value when locale changes from ltr to rtl', () => {
    setup(ltrLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    expect(directionality.value).toBe('ltr');
    locale$.next(rtlLocale as Locale);
    expect(directionality.value).toBe('rtl');
  });

  it('should update value when locale changes from rtl to ltr', () => {
    setup(rtlLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    expect(directionality.value).toBe('rtl');
    locale$.next(ltrLocale as Locale);
    expect(directionality.value).toBe('ltr');
  });

  it('should emit change event when direction changes', () => {
    setup(ltrLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    const emittedValues: string[] = [];
    directionality.change.subscribe(dir => emittedValues.push(dir));
    locale$.next(rtlLocale as Locale);
    locale$.next(ltrLocale as Locale);
    expect(emittedValues).toEqual(['rtl', 'ltr']);
  });

  it('should not emit change event when direction stays the same', () => {
    setup(ltrLocale);
    const directionality = TestBed.inject(Directionality) as I18nDirectionality;
    const emittedValues: string[] = [];
    directionality.change.subscribe(dir => emittedValues.push(dir));
    locale$.next(ltrLocale as Locale);
    expect(emittedValues).toEqual([]);
  });
});

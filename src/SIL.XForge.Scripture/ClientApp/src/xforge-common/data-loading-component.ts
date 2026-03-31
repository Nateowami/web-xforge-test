import { Directive, OnDestroy, reflectComponentType, Type } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NoticeService } from './notice.service';

/**
 * This is the abstract base class for components that need to indicate when they are loading data in order to display
 * the loading indicator. Subclasses call `loadingStarted()` and `loadingFinished()` to indicate when they are loading
 * data. When the component is destroyed, it automatically calls `loadingFinished()`.
 */
// Decorator required by Angular compiler
@Directive()
export abstract class DataLoadingComponent implements OnDestroy {
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  private _isLoaded$ = new BehaviorSubject<boolean>(false);

  constructor(protected readonly noticeService: NoticeService) {}

  get isLoadingData$(): Observable<boolean> {
    return this._isLoading$.asObservable();
  }

  get isLoadingData(): boolean {
    return this._isLoading$.value;
  }

  get isLoaded$(): Observable<boolean> {
    return this._isLoaded$.asObservable();
  }

  get isLoaded(): boolean {
    return this._isLoaded$.value;
  }

  ngOnDestroy(): void {
    this.loadingFinished();
  }

  /**
   * Returns a stable identifier for this component to use as the caller ID when reporting loading state. The Angular
   * component selector (e.g. 'app-editor') is preferred because it is a string literal preserved in minified
   * production builds. Falls back to the constructor name if the component type cannot be reflected (e.g. for abstract
   * directives under test).
   */
  get loadingCallerId(): string {
    const mirror = reflectComponentType(this.constructor as Type<unknown>);
    return mirror?.selector ?? this.constructor.name;
  }

  protected loadingStarted(): void {
    if (!this.isLoadingData) {
      this.noticeService.loadingStarted(this.loadingCallerId);
      this._isLoading$.next(true);
      this._isLoaded$.next(false);
    }
  }

  protected loadingFinished(): void {
    if (this.isLoadingData) {
      this.noticeService.loadingFinished(this.loadingCallerId);
      this._isLoading$.next(false);
      this._isLoaded$.next(true);
    }
  }
}

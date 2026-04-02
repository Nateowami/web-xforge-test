import { Directive, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NoticeService } from './notice.service';

/**
 * This is the abstract base class for components that need to indicate when they are loading data in order to display
 * the loading indicator. Subclasses call `loadingStarted()` and `loadingFinished()` to indicate when they are loading
 * data. When the component is destroyed, it automatically calls `loadingFinished()`.
 *
 * Each subclass must provide a `loadingCallerId` string literal equal to the name of the subclass (e.g.
 * 'EditorComponent'). Using a string literal — rather than `this.constructor.name` — ensures the identifier survives
 * JavaScript minification in production builds, where class names are replaced with single characters.
 */
// Decorator required by Angular compiler
@Directive()
export abstract class DataLoadingComponent implements OnDestroy {
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  private _isLoaded$ = new BehaviorSubject<boolean>(false);

  /**
   * A stable string identifier for this component used when reporting loading state to the notice service. Each
   * subclass must override this with its class name as a string literal (e.g. 'EditorComponent'), which is a string
   * literal preserved in minified production builds.
   */
  abstract readonly loadingCallerId: string;

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

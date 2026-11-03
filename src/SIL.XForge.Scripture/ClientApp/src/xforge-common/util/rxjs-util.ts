import { DestroyRef, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonoTypeOperatorFunction, Observable, OperatorFunction } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { hasStringProp } from '../../type-utils';

/**
 * Rxjs pipeable operator function to filters out null and undefined values.
 *
 * @returns {OperatorFunction<T | undefined, T>} An observable that emits only values that are not null or undefined.
 */
export function filterNullish<T>(): OperatorFunction<T | undefined | null, T> {
  return filter((value): value is T => value != null);
}

/**
 * Like `takeUntilDestroyed`, but catches and logs NG0911 errors (unless `options.logWarnings` is false).
 */
export function quietTakeUntilDestroyed<T>(
  destroyRef: DestroyRef,
  options = { logWarnings: true }
): MonoTypeOperatorFunction<T> {
  const stack = new Error().stack;
  const wrappedDestroyRef = {
    onDestroy(callback: () => void): () => void {
      try {
        return destroyRef.onDestroy(callback);
      } catch (error) {
        const isNG0911 = hasStringProp(error, 'message') && error.message.includes('NG0911');
        if (isNG0911 && options.logWarnings) {
          console.warn('NG0911 error caught and ignored. Original stack: ', stack);
        }
        if (!isNG0911) throw error;
        callback();
        return () => {};
      }
    },
    destroyed: destroyRef.destroyed
  };
  return takeUntilDestroyed(wrappedDestroyRef);
}

/**
 * Creates an observable that emits once the size of the element has stopped changing for `debounceMs`. This includes
 * changes that come from layout around the element (such as a neighbouring pane being shown or hidden) rather than from
 * the window being resized.
 *
 * ResizeObserver reports on every frame while the element is being resized. Those reports and the debounce timer run
 * outside the Angular zone, and only the debounced emission enters it, so change detection runs once per resize rather
 * than once per frame. (Zone.js does not patch ResizeObserver, so without that last step the emission would not trigger
 * change detection at all.)
 */
export function fromElementResize(element: Element, ngZone: NgZone, debounceMs: number): Observable<void> {
  const resizes$ = new Observable<void>(subscriber => {
    const resizeObserver = new ResizeObserver(() => subscriber.next());
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  });
  return new Observable<void>(subscriber =>
    ngZone.runOutsideAngular(() =>
      resizes$.pipe(debounceTime(debounceMs)).subscribe(() => ngZone.run(() => subscriber.next()))
    )
  );
}

import { Component, DestroyRef, NgZone, OnDestroy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { filterNullish, fromElementResize, quietTakeUntilDestroyed } from './rxjs-util';

describe('filterNullUndefined', () => {
  it('should filter out only null and undefined values', () => {
    const source$: Observable<number | string | boolean | object | bigint | undefined | null> = from([
      0,
      1,
      undefined,
      null,
      NaN,
      {},
      'hello',
      '',
      null,
      false,
      undefined,
      -0,
      0n
    ]);
    const result$: Observable<number | string | boolean | object | bigint> = source$.pipe(filterNullish());

    const expected: (number | string | boolean | object | bigint)[] = [0, 1, NaN, {}, 'hello', '', false, -0, 0n];
    const result: (number | string | boolean | object | bigint)[] = [];
    result$.subscribe(value => result.push(value));

    expect(result).toEqual(expected);
  });
});

describe('quietTakeUntilDestroyed', () => {
  it('should unsubscribe observables when the destroyRef callback is called', () => {
    let onDestroyCallback: () => void;
    const destroyRef: DestroyRef = {
      onDestroy: (callback: () => void) => {
        onDestroyCallback = callback;
        return () => {};
      },
      destroyed: false
    };

    let completed = false;

    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(destroyRef)).subscribe({
      complete: () => {
        completed = true;
      }
    });

    expect(completed).toBeFalse();
    onDestroyCallback!();
    expect(completed).toBeTrue();
  });

  it('should unsubscribe when the component is destroyed', () => {
    const fixture = TestBed.createComponent(QuietTakeUntilDestroyedTestComponent);
    const component = fixture.componentInstance;
    expect(component.mainSubjectCompleted).toBeFalse();
    expect(component.subjectCreatedAfterDestroyCompleted).toBeFalse();
    fixture.destroy();
    expect(component.mainSubjectCompleted).toBeTrue();
    expect(component.subjectCreatedAfterDestroyCompleted).toBeTrue();
  });
});

describe('fromElementResize', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.width = '100px';
    element.style.height = '50px';
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  /** ResizeObserver notifications are delivered after layout, so wait until a frame has been rendered. */
  function nextFrames(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  it('should emit when the element is resized without the window being resized', async () => {
    const emissions: ResizeObserverEntry[][] = [];
    const subscription = fromElementResize(element, TestBed.inject(NgZone)).subscribe(entries =>
      emissions.push(entries)
    );
    await nextFrames();
    const emissionCountBeforeResize = emissions.length;

    element.style.width = '300px';
    await nextFrames();

    expect(emissions.length).toBe(emissionCountBeforeResize + 1);
    expect(emissions[emissions.length - 1][0].contentRect.width).toBe(300);
    subscription.unsubscribe();
  });

  it('should stop observing when unsubscribed', async () => {
    const emissions: ResizeObserverEntry[][] = [];
    const subscription = fromElementResize(element, TestBed.inject(NgZone)).subscribe(entries =>
      emissions.push(entries)
    );
    await nextFrames();
    const emissionCountBeforeUnsubscribe = emissions.length;
    subscription.unsubscribe();

    element.style.width = '300px';
    await nextFrames();

    expect(emissions.length).toBe(emissionCountBeforeUnsubscribe);
  });

  it('should emit inside the Angular zone so that change detection runs', async () => {
    const insideAngularZone: boolean[] = [];
    const subscription = fromElementResize(element, TestBed.inject(NgZone)).subscribe(() =>
      insideAngularZone.push(NgZone.isInAngularZone())
    );
    element.style.width = '300px';
    await nextFrames();

    expect(insideAngularZone.length).toBeGreaterThan(0);
    expect(insideAngularZone.every(inZone => inZone)).toBeTrue();
    subscription.unsubscribe();
  });
});

@Component({})
class QuietTakeUntilDestroyedTestComponent implements OnDestroy {
  mainSubjectCompleted = false;
  subjectCreatedAfterDestroyCompleted = false;

  constructor(private destroyRef: DestroyRef) {
    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(this.destroyRef)).subscribe({
      complete: () => {
        this.mainSubjectCompleted = true;
      }
    });
  }

  ngOnDestroy(): void {
    new BehaviorSubject(1).pipe(quietTakeUntilDestroyed(this.destroyRef, { logWarnings: false })).subscribe({
      complete: () => {
        this.subjectCreatedAfterDestroyCompleted = true;
      }
    });
  }
}

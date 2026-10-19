import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { RealtimeDocAdapter } from '../realtime-remote-store';
import { RealtimeService } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { configureTestingModule } from '../test-utils';
import { RealtimeDoc } from './realtime-doc';

class TestDoc extends RealtimeDoc {}

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('retries a subscription that failed', fakeAsync(() => {
    const env = new TestEnvironment();
    env.subscribeErrors.push(new Error('403: Permission denied (read)'), undefined);

    let firstError: unknown;
    env.doc.subscribe().catch(error => (firstError = error));
    tick();
    expect(firstError).toEqual(new Error('403: Permission denied (read)'));

    let subscribed = false;
    void env.doc.subscribe().then(() => (subscribed = true));
    tick();
    expect(subscribed).toBe(true);
    expect(env.subscribeCallCount).toBe(2);
  }));

  it('does not raise an unhandled rejection when the adapter goes idle after a failed subscription', fakeAsync(() => {
    const env = new TestEnvironment();
    env.subscribeErrors.push(new Error('403: Permission denied (read)'));

    let failed = false;
    env.doc.subscribe().catch(() => (failed = true));
    env.idle$.next();
    // fakeAsync fails the test if anything else awaits the failed subscription without handling the error
    tick();
    expect(failed).toBe(true);
  }));
});

class TestEnvironment {
  readonly idle$ = new Subject<void>();
  /** The outcome of each call to the adapter's subscribe method. Calls beyond the list succeed. */
  readonly subscribeErrors: (Error | undefined)[] = [];
  subscribeCallCount = 0;
  readonly doc: TestDoc;

  constructor() {
    const adapter = {
      id: 'doc01',
      collection: 'test',
      type: undefined,
      subscribed: false,
      remoteChanges$: new Subject<void>(),
      idle$: this.idle$,
      create$: new Subject<void>(),
      delete$: new Subject<void>(),
      subscribe: () => {
        this.subscribeCallCount++;
        const error = this.subscribeErrors.shift();
        return error == null ? Promise.resolve() : Promise.reject(error);
      }
    } as unknown as RealtimeDocAdapter;
    this.doc = new TestDoc(TestBed.inject(RealtimeService), adapter);
  }
}

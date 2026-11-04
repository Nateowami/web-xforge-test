import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { RealtimeService } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { configureTestingModule } from '../test-utils';
import { RealtimeDoc } from './realtime-doc';

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('does not raise a failed subscribe again when the adapter becomes idle', fakeAsync(() => {
    const env = new TestEnvironment();
    let subscribeError: Error | undefined;

    env.doc.subscribe().catch(error => (subscribeError = error));
    // ShareDB emits 'no write pending' right after reporting a failed subscribe
    env.adapter.idle$.next();
    // fakeAsync fails the test if a promise rejection goes unhandled
    flush();

    expect(subscribeError?.message).toContain('403: Permission denied (read)');
  }));

  it('can be disposed after a failed subscribe', fakeAsync(() => {
    const env = new TestEnvironment();
    env.doc.subscribe().catch(() => {});
    flush();

    let disposed = false;
    void env.doc.dispose().then(() => (disposed = true));
    flush();

    expect(disposed).toBe(true);
  }));
});

/** A doc adapter whose subscribe is refused by the server, as when the user may no longer read the doc. */
class ReadDeniedDocAdapter extends MemoryRealtimeDocAdapter {
  override readonly idle$ = new Subject<void>();

  constructor() {
    super('test_docs', 'doc01');
    // Not loaded from IndexedDB, so subscribing waits for the server's answer
    this.type = undefined;
  }

  override subscribe(): Promise<void> {
    return Promise.reject(new Error('403: Permission denied (read), collection: test_docs, docId: doc01'));
  }
}

/** A concrete doc to exercise the behavior of the abstract RealtimeDoc. */
class TestDoc extends RealtimeDoc {}

class TestEnvironment {
  readonly adapter = new ReadDeniedDocAdapter();
  readonly doc = new TestDoc(TestBed.inject(RealtimeService), this.adapter);
}

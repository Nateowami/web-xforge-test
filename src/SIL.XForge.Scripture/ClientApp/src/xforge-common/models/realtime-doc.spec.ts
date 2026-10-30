import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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

  it('does not raise an unhandled rejection after a failed subscribe', fakeAsync(() => {
    const adapter = new DeniedReadDocAdapter();
    const doc = new TestRealtimeDoc(TestBed.inject(RealtimeService), adapter);

    let subscribeError: unknown;
    doc.subscribe().catch(error => (subscribeError = error));
    tick();
    expect(subscribeError).toEqual(new Error('403: Permission denied (read)'));

    // ShareDB emits 'no write pending' after the failed subscribe. fakeAsync throws on an unhandled rejection.
    adapter.idle$.next();
    expect(() => tick()).not.toThrow();
  }));
});

class TestRealtimeDoc extends RealtimeDoc {}

class DeniedReadDocAdapter extends MemoryRealtimeDocAdapter {
  override readonly idle$ = new Subject<void>();

  constructor() {
    super('texts', 'project01:MAT:1:target');
    // Not loaded from the offline store, so subscribing waits for the server
    this.type = undefined;
  }

  override subscribe(): Promise<void> {
    return Promise.reject(new Error('403: Permission denied (read)'));
  }
}

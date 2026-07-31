import { TestBed } from '@angular/core/testing';
import { SF_TYPE_REGISTRY } from '../../app/core/models/sf-type-registry';
import { MemoryRealtimeDocAdapter } from '../memory-realtime-remote-store';
import { RealtimeService } from '../realtime.service';
import { provideTestRealtime } from '../test-realtime-providers';
import { configureTestingModule } from '../test-utils';
import { RealtimeDoc } from './realtime-doc';

class TestDoc extends RealtimeDoc {}

/** An adapter whose subscription fails the way the realtime server rejects a read the user is not allowed. */
class AccessDeniedDocAdapter extends MemoryRealtimeDocAdapter {
  constructor(private readonly error: Error) {
    super('test_docs', 'doc01');
    // the doc was never loaded, because the server would not send it
    this.type = undefined;
  }

  override subscribe(): Promise<void> {
    return Promise.reject(this.error);
  }
}

describe('RealtimeDoc', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  it('reports a doc as deleted when the realtime server denies read access', async () => {
    const realtimeService = TestBed.inject(RealtimeService);
    const doc = new TestDoc(
      realtimeService,
      new AccessDeniedDocAdapter(new Error('403: Permission denied (read), collection: sf_projects, docId: project01'))
    );
    let deleted = false;
    doc.delete$.subscribe(() => (deleted = true));

    // this should not throw, as losing access to a doc is an expected condition, not an error
    await doc.subscribe();

    expect(doc.isDeleted).toBe(true);
    expect(doc.isLoaded).toBe(false);
    expect(deleted).toBe(true);
  });

  it('still reports other subscription failures as errors', async () => {
    const realtimeService = TestBed.inject(RealtimeService);
    const doc = new TestDoc(realtimeService, new AccessDeniedDocAdapter(new Error('Something went wrong')));

    await expectAsync(doc.subscribe()).toBeRejectedWithError('Something went wrong');
    expect(doc.isDeleted).toBe(false);
  });
});

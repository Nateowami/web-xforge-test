import { Doc } from 'sharedb/lib/client';
import { SharedbRealtimeDocAdapter } from './sharedb-realtime-remote-store';

describe('SharedbRealtimeDocAdapter', () => {
  it('resolves an op that failed because the doc no longer exists on the server', async () => {
    const doc = new MockDoc(createError('ERR_OP_VERSION_NEWER_THAN_CURRENT_SNAPSHOT'));
    const adapter = new SharedbRealtimeDocAdapter(doc as unknown as Doc);

    await expectAsync(adapter.submitOp([])).toBeResolved();
  });

  it('rejects an op that failed for any other reason', async () => {
    const error = createError('ERR_OP_SUBMIT_REJECTED');
    const adapter = new SharedbRealtimeDocAdapter(new MockDoc(error) as unknown as Doc);

    await expectAsync(adapter.submitOp([])).toBeRejectedWith(error);
  });

  it('ignores a doc error reporting that the doc no longer exists on the server', () => {
    const doc = new MockDoc();
    new SharedbRealtimeDocAdapter(doc as unknown as Doc);

    expect(() => doc.emitError(createError('ERR_DOC_WAS_DELETED'))).not.toThrow();
  });

  it('passes on any other doc error', () => {
    const doc = new MockDoc();
    const error = createError('ERR_HARD_ROLLBACK_FETCH_FAILED');
    new SharedbRealtimeDocAdapter(doc as unknown as Doc);

    expect(() => doc.emitError(error)).toThrow(error);
  });

  function createError(code: string): Error {
    return Object.assign(new Error(code), { code });
  }
});

/** A stand-in for a ShareDB doc whose ops fail with the specified error, if any. */
class MockDoc {
  private readonly errorListeners: ((error: Error) => void)[] = [];

  constructor(private readonly submitOpError?: Error) {}

  on(event: string, listener: (error: Error) => void): void {
    if (event === 'error') {
      this.errorListeners.push(listener);
    }
  }

  off(event: string, listener: (error: Error) => void): void {
    if (event === 'error') {
      const index = this.errorListeners.indexOf(listener);
      if (index >= 0) {
        this.errorListeners.splice(index, 1);
      }
    }
  }

  submitOp(_op: any, _options: any, callback: (error?: Error) => void): void {
    callback(this.submitOpError);
  }

  emitError(error: Error): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }
}

import { DestroyRef } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { createTestUser } from 'realtime-server/lib/esm/common/models/user-test-data';
import { BehaviorSubject } from 'rxjs';
import { instance, mock, verify, when } from 'ts-mockito';
import { SF_TYPE_REGISTRY } from '../app/core/models/sf-type-registry';
import { RealtimeDoc } from './models/realtime-doc';
import { RealtimeOfflineData } from './models/realtime-offline-data';
import { RealtimeQuery } from './models/realtime-query';
import { UserDoc } from './models/user-doc';
import { RealtimeService } from './realtime.service';
import { provideTestRealtime } from './test-realtime-providers';
import { TestRealtimeService } from './test-realtime.service';
import { configureTestingModule } from './test-utils';

describe('RealtimeService', () => {
  configureTestingModule(() => ({
    providers: [provideTestRealtime(SF_TYPE_REGISTRY)]
  }));

  describe('manageQuery', () => {
    let service: RealtimeService;
    let destroyRef: DestroyRef;
    let mockQuery: RealtimeQuery<RealtimeDoc>;
    let queryInstance: RealtimeQuery<RealtimeDoc>;
    let ready$: BehaviorSubject<boolean>;
    let onDestroyCallback: () => void;

    beforeEach(() => {
      service = TestBed.inject(RealtimeService);

      ready$ = new BehaviorSubject<boolean>(false);
      mockQuery = mock(RealtimeQuery);
      when(mockQuery.ready$).thenReturn(ready$);
      queryInstance = instance(mockQuery);

      destroyRef = {
        onDestroy: (callback: () => void) => {
          onDestroyCallback = callback;
        }
      } as DestroyRef;
    });

    afterEach(() => {
      expect(true).toBe(true); // Suppress 'no expectations' warning
    });

    it('should dispose query when component is destroyed', fakeAsync(() => {
      const queryPromise = Promise.resolve(queryInstance);
      service['manageQuery'](queryPromise, destroyRef);

      onDestroyCallback();
      tick(5000);

      verify(mockQuery.dispose()).once();
    }));

    it('should dispose query immediately if view is already destroyed', fakeAsync(() => {
      const queryPromise = Promise.resolve(queryInstance);
      const destroyedRef = {
        onDestroy: () => {
          throw new Error('View destroyed');
        },
        destroyed: true
      } as DestroyRef;

      service['manageQuery'](queryPromise, destroyedRef);
      tick();

      verify(mockQuery.dispose()).once();
    }));

    it('should dispose query when ready$ emits true', fakeAsync(() => {
      const queryPromise = Promise.resolve(queryInstance);
      service['manageQuery'](queryPromise, destroyRef);
      onDestroyCallback();

      ready$.next(true);
      tick();

      verify(mockQuery.dispose()).once();
    }));

    it('should dispose query after timeout if not ready', fakeAsync(() => {
      const queryPromise = Promise.resolve(queryInstance);
      service['manageQuery'](queryPromise, destroyRef);
      onDestroyCallback();

      tick(5000);

      verify(mockQuery.dispose()).once();
    }));
  });

  describe('subscribeQuery', () => {
    it('should update the offline copy of a doc when a remote op arrives after the doc left the query', fakeAsync(async () => {
      const service = TestBed.inject(TestRealtimeService);
      service.addSnapshot<User>(UserDoc.COLLECTION, { id: 'user01', data: createTestUser({ name: 'Before' }) });
      const destroyRef = { onDestroy: () => {} } as unknown as DestroyRef;
      const query = await service.subscribeQuery<UserDoc>(UserDoc.COLLECTION, { name: 'Before' }, destroyRef);
      tick();
      expect(query.docs.map(d => d.id)).toEqual(['user01']);
      const doc = query.docs[0];

      // ShareDB sends the query results diff before the op that changed the results
      service.addSnapshot<User>(UserDoc.COLLECTION, {
        id: doc.id,
        data: { ...doc.data!, name: 'After' },
        v: doc.adapter.version + 1
      });
      service.updateQueryAdaptersRemote();
      tick();
      expect(query.docs).toEqual([]);
      expect(doc.subscribed).toBe(false);
      await doc.adapter.submitOp([{ p: ['name'], od: 'Before', oi: 'After' }], false);
      tick();

      const offlineData = await service.offlineStore.get<RealtimeOfflineData>(UserDoc.COLLECTION, doc.id);
      expect(offlineData?.data.name).toEqual('After');
      expect(offlineData?.v).toEqual(doc.adapter.version);
      await query.localUpdate();
      expect(query.docs).toEqual([]);
    }));
  });
});

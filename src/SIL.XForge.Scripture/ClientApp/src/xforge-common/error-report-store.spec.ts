import { TestBed } from '@angular/core/testing';
import { ErrorReportStore, StoredErrorReport } from './error-report-store';
import { configureTestingModule } from './test-utils';

describe('ErrorReportStore', () => {
  configureTestingModule(() => ({ providers: [] }));

  it('stores and retrieves a report', async () => {
    const env = await TestEnvironment.create();

    // SUT
    await env.store.add(TestEnvironment.createReport({ id: 'report01' }));

    const reports: StoredErrorReport[] = await env.store.getAll();
    expect(reports.length).toEqual(1);
    expect(reports[0].id).toEqual('report01');
    expect(reports[0].message).toEqual('some error');
  });

  it('retrieves reports oldest first', async () => {
    const env = await TestEnvironment.create();
    await env.store.add(TestEnvironment.createReport({ id: 'newer', timestamp: Date.now() }));
    await env.store.add(TestEnvironment.createReport({ id: 'older', timestamp: Date.now() - 60_000 }));

    // SUT
    const reports: StoredErrorReport[] = await env.store.getAll();

    expect(reports.map(report => report.id)).toEqual(['older', 'newer']);
  });

  it('removes a report', async () => {
    const env = await TestEnvironment.create();
    await env.store.add(TestEnvironment.createReport({ id: 'report01' }));

    // SUT
    await env.store.remove('report01');

    expect((await env.store.getAll()).length).toEqual(0);
  });

  it('stores metadata containing an error', async () => {
    const env = await TestEnvironment.create();
    const metadata = { custom: { failure: new Error('nested error') } };

    // SUT
    await env.store.add(TestEnvironment.createReport({ id: 'report01', metadata: metadata }));

    const reports: StoredErrorReport[] = await env.store.getAll();
    expect(reports[0].metadata['custom']['failure'].message).toEqual('nested error');
  });

  it('leaves out metadata that cannot be stored, rather than losing the report', async () => {
    const env = await TestEnvironment.create();
    const circular: any = { name: 'circular' };
    circular.self = circular;

    // SUT
    await env.store.add(
      TestEnvironment.createReport({ id: 'report01', metadata: { circular: circular, custom: { key: 'value' } } })
    );

    const reports: StoredErrorReport[] = await env.store.getAll();
    expect(reports.length).toEqual(1);
    expect(reports[0].metadata['circular']).toBeUndefined();
    expect(reports[0].metadata['custom']['key']).toEqual('value');
  });

  it('discards reports that are too old to be of interest', async () => {
    const env = await TestEnvironment.create();
    const fortyDaysAgo: number = Date.now() - 40 * 24 * 60 * 60 * 1000;

    // SUT
    await env.store.add(TestEnvironment.createReport({ id: 'ancient', timestamp: fortyDaysAgo }));

    expect((await env.store.getAll()).length).toEqual(0);
  });

  it('discards the oldest reports when there are too many', async () => {
    const env = await TestEnvironment.create();
    const reportCount = 55;
    const firstTimestamp: number = Date.now() - reportCount;
    for (let index = 0; index < reportCount; index++) {
      // SUT
      await env.store.add(TestEnvironment.createReport({ id: `report${index}`, timestamp: firstTimestamp + index }));
    }

    const reports: StoredErrorReport[] = await env.store.getAll();
    expect(reports.length).toEqual(50);
    expect(reports[0].id).toEqual('report5');
    expect(reports[49].id).toEqual(`report${reportCount - 1}`);
  });
});

class TestEnvironment {
  readonly store: ErrorReportStore;

  private constructor() {
    this.store = TestBed.inject(ErrorReportStore);
  }

  static async create(): Promise<TestEnvironment> {
    await TestEnvironment.deleteDatabase();
    return new TestEnvironment();
  }

  static createReport({
    id,
    timestamp = Date.now(),
    metadata = {}
  }: {
    id: string;
    timestamp?: number;
    metadata?: { [tabName: string]: any };
  }): StoredErrorReport {
    return {
      id: id,
      timestamp: timestamp,
      name: 'Error',
      message: 'some error',
      url: 'http://localhost:5000/projects',
      stack: 'some stack',
      unhandled: true,
      metadata: metadata
    };
  }

  private static deleteDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('xforge-error-reports');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

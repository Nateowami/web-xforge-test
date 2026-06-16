import { Meta, StoryObj } from '@storybook/angular';
import { createTestUserProfile } from 'realtime-server/lib/esm/common/models/user-test-data';
import { expect, waitFor } from 'storybook/test';
import { anything, instance, mock, when } from 'ts-mockito';
import { UserProfileDoc } from 'xforge-common/models/user-profile-doc';
import { UserService } from 'xforge-common/user.service';
import { SyncMetrics, SyncStatus } from '../sync-metrics';
import { SyncLogComponent } from './sync-log.component';

const mockedUserService = mock(UserService);

const projectId = 'project01';
const userId1 = 'user01';
const userId2 = 'user02';

/** Fixed base date for consistent timestamps across all stories. */
const baseDate = new Date('2025-06-15T08:00:00Z');
function daysAgo(days: number): string {
  return new Date(baseDate.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** A successful sync entry triggered by user01. */
const successfulEntry: SyncMetrics = {
  id: 'sync-success-1',
  dateQueued: daysAgo(1),
  dateStarted: daysAgo(1),
  dateFinished: daysAgo(1),
  status: SyncStatus.Successful,
  projectRef: projectId,
  userRef: userId1,
  log: ['Sync completed successfully.']
};

/** A failed sync entry with error details, triggered by user02. */
const failedEntry: SyncMetrics = {
  id: 'sync-failed-1',
  dateQueued: daysAgo(3),
  dateStarted: daysAgo(3),
  dateFinished: daysAgo(3),
  status: SyncStatus.Failed,
  errorDetails:
    'System.Exception: Unable to connect to Paratext server.\n  at ParatextService.SyncAsync()\n  at SyncRunner.RunAsync()',
  projectRef: projectId,
  userRef: userId2,
  log: ['Sync failed: Unable to connect to Paratext server.']
};

/** A cancelled sync entry triggered by user01. */
const cancelledEntry: SyncMetrics = {
  id: 'sync-cancelled-1',
  dateQueued: daysAgo(5),
  dateStarted: daysAgo(5),
  dateFinished: daysAgo(5),
  status: SyncStatus.Cancelled,
  projectRef: projectId,
  userRef: userId1,
  log: ['Sync was cancelled by user.']
};

/** A sync that is currently running. */
const runningEntry: SyncMetrics = {
  id: 'sync-running-1',
  dateQueued: daysAgo(0),
  dateStarted: daysAgo(0),
  status: SyncStatus.Running,
  projectRef: projectId,
  userRef: userId1,
  log: ['Sync started...']
};

/** A sync that is queued but not yet started. */
const queuedEntry: SyncMetrics = {
  id: 'sync-queued-1',
  dateQueued: daysAgo(0),
  status: SyncStatus.Queued,
  projectRef: projectId,
  userRef: userId2,
  log: []
};

/** Configures the UserService mock so OwnerComponent can resolve user profiles. */
function setUpMocks(): void {
  when(mockedUserService.currentUserId).thenReturn(userId1);
  when(mockedUserService.getProfile(userId1)).thenResolve({
    id: userId1,
    data: createTestUserProfile({}, 1)
  } as UserProfileDoc);
  when(mockedUserService.getProfile(userId2)).thenResolve({
    id: userId2,
    data: createTestUserProfile({}, 2)
  } as UserProfileDoc);
  when(mockedUserService.getProfile(anything())).thenResolve({
    id: 'unknown',
    data: createTestUserProfile({}, 3)
  } as UserProfileDoc);
}

/** Stories for SyncLogComponent, showcasing all sync log states visible to admin users. */
const meta: Meta<SyncLogComponent> = {
  title: 'Sync/Sync Log',
  component: SyncLogComponent,
  render: args => {
    setUpMocks();
    return {
      props: args,
      moduleMetadata: {
        providers: [{ provide: UserService, useValue: instance(mockedUserService) }]
      }
    };
  }
};

export default meta;
type Story = StoryObj<SyncLogComponent>;

/** Sync log with no entries yet. */
export const EmptySyncLog: Story = {
  args: { entries: [], totalCount: 0, loading: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('#sync-log-empty')).not.toBeNull();
    });
  }
};

/** Sync log with a recent successful sync. */
export const SuccessfulSync: Story = {
  args: { entries: [successfulEntry], totalCount: 1, loading: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry')).not.toBeNull();
    });
  }
};

/** Sync log with a failed sync showing expandable error details. */
export const FailedSync: Story = {
  args: { entries: [failedEntry], totalCount: 1, loading: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry-failed')).not.toBeNull();
    });
  }
};

/** Sync log with a cancelled sync. */
export const CancelledSync: Story = {
  args: { entries: [cancelledEntry], totalCount: 1, loading: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry')).not.toBeNull();
    });
  }
};

/** Sync log showing running and queued syncs. */
export const RunningSyncs: Story = {
  args: { entries: [runningEntry, queuedEntry], totalCount: 2, loading: false },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const entries: NodeListOf<Element> = canvasElement.querySelectorAll('.sync-log-entry');
      expect(entries.length).toBe(2);
    });
  }
};

/** Sync log showing all five possible status states at once. */
export const AllStatuses: Story = {
  args: {
    entries: [runningEntry, queuedEntry, successfulEntry, failedEntry, cancelledEntry],
    totalCount: 5,
    loading: false
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const entries: NodeListOf<Element> = canvasElement.querySelectorAll('.sync-log-entry');
      expect(entries.length).toBe(5);
    });
  }
};

/** Sync log with more entries available to load via the "Load more" button. */
export const LoadMoreAvailable: Story = {
  args: {
    entries: [successfulEntry, cancelledEntry, failedEntry, successfulEntry, successfulEntry].map((entry, i) => ({
      ...entry,
      id: `sync-${i}`,
      dateQueued: daysAgo(i)
    })),
    totalCount: 12,
    loading: false
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('#btn-load-more-sync-log')).not.toBeNull();
    });
  }
};

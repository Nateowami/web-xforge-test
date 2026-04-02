import { EMPTY, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Meta, StoryObj } from '@storybook/angular';
import { SFProject } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { createTestProject } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { createTestUserProfile } from 'realtime-server/lib/esm/common/models/user-test-data';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { expect, waitFor } from 'storybook/test';
import { anything, instance, mock, when } from 'ts-mockito';
import { AuthService } from 'xforge-common/auth.service';
import { DialogService } from 'xforge-common/dialog.service';
import { UserProfileDoc } from 'xforge-common/models/user-profile-doc';
import { NoticeService } from 'xforge-common/notice.service';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { UserService } from 'xforge-common/user.service';
import { SFProjectDoc } from '../core/models/sf-project-doc';
import { ParatextService } from '../core/paratext.service';
import { SFProjectService } from '../core/sf-project.service';
import { SyncMetrics, SyncStatus } from './sync-metrics';
import { SyncComponent } from './sync.component';

const mockedActivatedRoute = mock(ActivatedRoute);
const mockedAuthService = mock(AuthService);
const mockedDialogService = mock(DialogService);
const mockedNoticeService = mock(NoticeService);
const mockedOnlineStatusService = mock(OnlineStatusService);
const mockedParatextService = mock(ParatextService);
const mockedProjectDoc = mock(SFProjectDoc);
const mockedProjectService = mock(SFProjectService);
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

/** Arguments that control the story's displayed sync log data. */
interface StoryState {
  syncLogEntries: SyncMetrics[];
  syncLogTotalCount: number;
}

/** Configures all required service mocks before the component is rendered. */
function setUpMocks(args: StoryState): void {
  const project: SFProject = createTestProject({
    name: 'Test Project',
    sync: {
      queuedCount: 0,
      lastSyncSuccessful: true,
      dateLastSuccessfulSync: daysAgo(1)
    }
  });

  // Mock SFProjectDoc directly to avoid the TestBed/RealtimeService async chain.
  when(mockedProjectDoc.data).thenReturn(project);
  when(mockedProjectDoc.id).thenReturn(projectId);
  when(mockedProjectDoc.remoteChanges$).thenReturn(EMPTY);

  when(mockedActivatedRoute.params).thenReturn(of({ projectId }));
  when(mockedAuthService.currentUserRoles).thenReturn([SystemRole.SystemAdmin]);
  when(mockedOnlineStatusService.onlineStatus$).thenReturn(of(true));
  when(mockedParatextService.getParatextUsername()).thenReturn(of('Paratext User'));
  when(mockedNoticeService.loadingStarted(anything())).thenReturn(undefined);
  when(mockedNoticeService.loadingFinished(anything())).thenReturn(undefined);
  when(mockedProjectService.get(anything())).thenResolve(instance(mockedProjectDoc));
  when(mockedProjectService.onlineSyncMetrics(anything(), anything(), anything())).thenResolve({
    results: args.syncLogEntries,
    unpagedCount: args.syncLogTotalCount
  });
  when(mockedUserService.currentUserId).thenReturn(userId1);
  when(mockedUserService.getProfile(userId1)).thenResolve({
    id: userId1,
    data: createTestUserProfile({}, 1)
  } as UserProfileDoc);
  when(mockedUserService.getProfile(userId2)).thenResolve({
    id: userId2,
    data: createTestUserProfile({}, 2)
  } as UserProfileDoc);
}

/** Stories for SyncComponent, showcasing all sync log states visible to admin users. */
const meta: Meta = {
  title: 'Sync/Sync Component',
  component: SyncComponent,
  argTypes: {
    syncLogEntries: { control: false },
    syncLogTotalCount: { control: false }
  },
  render: args => {
    setUpMocks(args as StoryState);
    return {
      moduleMetadata: {
        providers: [
          { provide: ActivatedRoute, useValue: instance(mockedActivatedRoute) },
          { provide: AuthService, useValue: instance(mockedAuthService) },
          { provide: DialogService, useValue: instance(mockedDialogService) },
          { provide: NoticeService, useValue: instance(mockedNoticeService) },
          { provide: OnlineStatusService, useValue: instance(mockedOnlineStatusService) },
          { provide: ParatextService, useValue: instance(mockedParatextService) },
          { provide: SFProjectService, useValue: instance(mockedProjectService) },
          { provide: UserService, useValue: instance(mockedUserService) }
        ]
      }
    };
  }
};

export default meta;
type Story = StoryObj<StoryState>;

/** Sync log with no entries yet. */
export const EmptySyncLog: Story = {
  args: { syncLogEntries: [], syncLogTotalCount: 0 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('#sync-log-empty')).not.toBeNull();
    });
  }
};

/** Sync log with a recent successful sync. */
export const SuccessfulSync: Story = {
  args: { syncLogEntries: [successfulEntry], syncLogTotalCount: 1 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry')).not.toBeNull();
    });
  }
};

/** Sync log with a failed sync showing expandable error details. */
export const FailedSync: Story = {
  args: { syncLogEntries: [failedEntry], syncLogTotalCount: 1 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry-failed')).not.toBeNull();
    });
  }
};

/** Sync log with a cancelled sync. */
export const CancelledSync: Story = {
  args: { syncLogEntries: [cancelledEntry], syncLogTotalCount: 1 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.sync-log-entry')).not.toBeNull();
    });
  }
};

/** Sync log showing running and queued syncs. */
export const RunningSyncs: Story = {
  args: { syncLogEntries: [runningEntry, queuedEntry], syncLogTotalCount: 2 },
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
    syncLogEntries: [runningEntry, queuedEntry, successfulEntry, failedEntry, cancelledEntry],
    syncLogTotalCount: 5
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
    syncLogEntries: [successfulEntry, cancelledEntry, failedEntry, successfulEntry, successfulEntry].map(
      (entry, i) => ({ ...entry, id: `sync-${i}`, dateQueued: daysAgo(i) })
    ),
    syncLogTotalCount: 12
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('#btn-load-more-sync-log')).not.toBeNull();
    });
  }
};

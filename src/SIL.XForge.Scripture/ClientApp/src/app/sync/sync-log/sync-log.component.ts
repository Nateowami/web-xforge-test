import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { OwnerComponent } from 'xforge-common/owner/owner.component';
import { SyncMetrics, SyncStatus } from '../sync-metrics';

/**
 * Displays the sync history log for a project, showing each past sync entry with its status, user, date, and optional
 * error details. System and Serval admins can see full error details (stack traces); other users see a redacted view.
 */
@Component({
  selector: 'app-sync-log',
  templateUrl: './sync-log.component.html',
  styleUrls: ['./sync-log.component.scss'],
  imports: [TranslocoModule, MatCard, MatButton, MatIcon, OwnerComponent]
})
export class SyncLogComponent {
  /** The SyncStatus enum, exposed so the template can reference enum values. */
  readonly SyncStatus = SyncStatus;

  /** The list of sync history entries to display. */
  @Input() entries: SyncMetrics[] = [];

  /** The total number of sync history entries available (including those not yet loaded). */
  @Input() totalCount: number = 0;

  /** Whether a network request for more entries is in progress. */
  @Input() loading: boolean = false;

  /** Emitted when the user clicks the "Load more" button. */
  @Output() loadMore = new EventEmitter<void>();

  /** Whether there are more sync history entries available to load. */
  get canLoadMore(): boolean {
    return this.entries.length < this.totalCount;
  }

  /** Returns the transloco key suffix for the label of the given sync status. */
  syncStatusLabelKey(status: SyncStatus): string {
    switch (status) {
      case SyncStatus.Queued:
        return 'sync_status_queued';
      case SyncStatus.Running:
        return 'sync_status_running';
      case SyncStatus.Successful:
        return 'sync_status_successful';
      case SyncStatus.Cancelled:
        return 'sync_status_cancelled';
      case SyncStatus.Failed:
        return 'sync_status_failed';
      default:
        return status;
    }
  }

  /** Returns a Material icon name for the given sync status. */
  syncStatusIcon(status: SyncStatus): string {
    switch (status) {
      case SyncStatus.Queued:
        return 'schedule';
      case SyncStatus.Running:
        return 'sync';
      case SyncStatus.Successful:
        return 'check_circle';
      case SyncStatus.Cancelled:
        return 'cancel';
      case SyncStatus.Failed:
        return 'error';
      default:
        return 'help';
    }
  }
}

/** The status of a sync operation. Corresponds to the C# SyncStatus enum. */
export enum SyncStatus {
  Queued = 'Queued',
  Running = 'Running',
  Successful = 'Successful',
  Cancelled = 'Cancelled',
  Failed = 'Failed'
}

/** Counts of records added, updated, and deleted in a sync operation. */
export interface SyncMetricInfo {
  added: number;
  deleted: number;
  updated: number;
}

/** Information on each sync performed, returned from the sync_metrics collection. */
export interface SyncMetrics {
  id: string;
  dateQueued: string;
  dateStarted?: string;
  dateFinished?: string;
  status: SyncStatus;
  errorDetails?: string;
  projectRef: string;
  userRef?: string;
  log: string[];
}

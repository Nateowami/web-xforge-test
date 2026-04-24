import { DestroyRef, Injectable } from '@angular/core';
import { obj } from 'realtime-server/lib/esm/common/utils/obj-path';
import { getTrainingDataId, TrainingData } from 'realtime-server/lib/esm/scriptureforge/models/training-data';
import { from, map, merge, Observable, switchMap, finalize } from 'rxjs';
import { CommandService } from 'xforge-common/command.service';
import { RealtimeQuery } from 'xforge-common/models/realtime-query';
import { QueryParameters } from 'xforge-common/query-parameters';
import { RealtimeService } from 'xforge-common/realtime.service';
import { PROJECTS_URL } from 'xforge-common/url-constants';
import { TrainingDataDoc } from '../../../core/models/training-data-doc';

@Injectable({
  providedIn: 'root'
})
export class TrainingDataService {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly commandService: CommandService
  ) {}

  async createTrainingDataAsync(trainingData: TrainingData): Promise<void> {
    const docId: string = getTrainingDataId(trainingData.projectRef, trainingData.dataId);
    await this.realtimeService.create<TrainingDataDoc>(TrainingDataDoc.COLLECTION, docId, trainingData);
  }

  async deleteTrainingDataAsync(trainingData: TrainingData): Promise<void> {
    await this.commandService.onlineInvoke<void>(PROJECTS_URL, 'markTrainingDataDeleted', {
      projectId: trainingData.projectRef,
      dataId: trainingData.dataId
    });
  }

  queryTrainingDataAsync(projectId: string, destroyRef: DestroyRef): Promise<RealtimeQuery<TrainingDataDoc>> {
    const queryParams: QueryParameters = {
      [obj<TrainingData>().pathStr(t => t.projectRef)]: projectId
    };
    return this.realtimeService.subscribeQuery(TrainingDataDoc.COLLECTION, queryParams, destroyRef);
  }

  /**
   * Returns an observable of non-deleted training data files for a project. The observable emits a new list whenever
   * the underlying query results change (on ready, local changes, or remote changes). Deleted files are automatically
   * excluded. The query is disposed when the subscription is unsubscribed.
   */
  getActiveTrainingData$(projectId: string, destroyRef: DestroyRef): Observable<TrainingData[]> {
    return from(this.queryTrainingDataAsync(projectId, destroyRef)).pipe(
      switchMap(query =>
        merge(query.localChanges$, query.ready$, query.remoteChanges$, query.remoteDocChanges$).pipe(
          map(() => query.docs.filter(d => d.data != null && d.data.deleted !== true).map(d => d.data!)),
          finalize(() => query.dispose())
        )
      )
    );
  }
}

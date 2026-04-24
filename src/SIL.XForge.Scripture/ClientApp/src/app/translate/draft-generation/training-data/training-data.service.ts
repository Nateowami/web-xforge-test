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

  private queryTrainingDataAsync(projectId: string, destroyRef: DestroyRef): Promise<RealtimeQuery<TrainingDataDoc>> {
    const queryParams: QueryParameters = {
      [obj<TrainingData>().pathStr(t => t.projectRef)]: projectId
    };
    return this.realtimeService.subscribeQuery(TrainingDataDoc.COLLECTION, queryParams, destroyRef);
  }

  /**
   * Returns an observable of training data files for a project. The observable emits a new list whenever the
   * underlying query results change (on ready, local changes, or remote changes). The query is disposed when the
   * subscription is unsubscribed.
   *
   * By default, deleted files are excluded. Pass `{ includeDeleted: true }` to include them — useful when displaying
   * historical information about past builds where files may have since been deleted.
   */
  getTrainingData$(
    projectId: string,
    destroyRef: DestroyRef,
    options?: { includeDeleted?: boolean }
  ): Observable<TrainingData[]> {
    return from(this.queryTrainingDataAsync(projectId, destroyRef)).pipe(
      switchMap(query =>
        merge(query.localChanges$, query.ready$, query.remoteChanges$, query.remoteDocChanges$).pipe(
          map(() => {
            const docs = query.docs.filter(d => d.data != null);
            const filtered = options?.includeDeleted === true ? docs : docs.filter(d => d.data!.deleted !== true);
            return filtered.map(d => d.data!);
          }),
          finalize(() => query.dispose())
        )
      )
    );
  }
}

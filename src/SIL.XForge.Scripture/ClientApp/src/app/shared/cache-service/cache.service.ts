import { EventEmitter, Injectable } from '@angular/core';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { TextDocId } from '../../core/models/text-doc';
import { PermissionsService } from '../../core/permissions.service';
import { SFProjectService } from '../../core/sf-project.service';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private abortCurrent: EventEmitter<void> = new EventEmitter();
  constructor(
    private readonly projectService: SFProjectService,
    private readonly permissionsService: PermissionsService
  ) {}

  async cache(project: SFProjectProfileDoc): Promise<void> {
    this.abortCurrent.emit();
    await this.loadAllChapters(project);
  }

  private async loadAllChapters(project: SFProjectProfileDoc): Promise<void> {
    if (project?.data == null) return;

    let abort = false;
    const abortSub = this.abortCurrent.subscribe(() => (abort = true));
    // Stop caching if the project is deleted, because its chapters can no longer be loaded
    const deleteSub = project.delete$.subscribe(() => (abort = true));

    try {
      const sourceId = project.data.translateConfig.source?.projectRef;

      for (const text of project.data.texts) {
        for (const chapter of text.chapters) {
          if (abort) return;

          await this.cacheText(new TextDocId(project.id, text.bookNum, chapter.number, 'target'));

          if (text.hasSource && sourceId != null) {
            await this.cacheText(new TextDocId(sourceId, text.bookNum, chapter.number, 'target'));
          }
        }
      }
    } catch (error) {
      // A chapter that was loading when the project was deleted can fail to load. Caching has stopped, so ignore it.
      if (!abort) throw error;
    } finally {
      abortSub.unsubscribe();
      deleteSub.unsubscribe();
    }
  }

  private async cacheText(textDocId: TextDocId): Promise<void> {
    if (!(await this.permissionsService.canAccessTextAsync(textDocId))) return;
    try {
      await this.projectService.getText(textDocId);
    } catch (error) {
      // The user can lose access to a text while it is loading, such as when they are removed from the project. The
      // permission check above will skip the remaining texts once the change reaches this client, so skip this one.
      if (!isReadDeniedError(error)) throw error;
    }
  }
}

/** Whether the realtime server refused to let the user read a doc. */
function isReadDeniedError(error: unknown): boolean {
  // ShareDB passes on the access control error as a message without a distinguishing error code
  return error instanceof Error && error.message.startsWith('403: Permission denied (read)');
}

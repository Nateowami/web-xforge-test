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
      // The local project and user docs can lag behind the server, so the server may refuse a chapter that
      // canAccessTextAsync allowed: the user was just removed from the project, or a sync just took away their access
      // to one book. Skip the chapter and carry on with the rest. Once the local docs catch up, canAccessTextAsync
      // returns false, so a removed user does not keep requesting chapters.
      if (!isReadPermissionDenied(error)) throw error;
    }
  }
}

/**
 * Whether the realtime server refused to let the user read a doc. ShareDB gives such an error a generic code, so only its
 * message (written by sharedb-access) identifies it.
 */
function isReadPermissionDenied(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('403: Permission denied (read)');
}

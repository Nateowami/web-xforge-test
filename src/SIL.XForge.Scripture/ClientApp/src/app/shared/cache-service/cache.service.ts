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
    let abort = false;
    const sub = this.abortCurrent.subscribe(() => (abort = true));

    if (project?.data != null) {
      const sourceId = project.data.translateConfig.source?.projectRef;

      for (const text of project.data.texts) {
        for (const chapter of text.chapters) {
          if (abort) {
            sub.unsubscribe();
            return;
          }

          await this.cacheText(new TextDocId(project.id, text.bookNum, chapter.number, 'target'));

          if (text.hasSource && sourceId != null) {
            await this.cacheText(new TextDocId(sourceId, text.bookNum, chapter.number, 'target'));
          }
        }
      }
    }
  }

  /**
   * Caches a single text doc, if the user can access it.
   *
   * Caching is a best-effort background prefetch, so a failure must not propagate. Caching runs on every project
   * activation, including on pages that display no Scripture at all, and nothing awaits the result. An error
   * escaping from here therefore becomes an unhandled rejection, which shows the user the generic error dialog and
   * files a Bugsnag report every single time they open the project. It also abandons the caching of every
   * remaining chapter. The most likely failure is the server refusing the read because the user's permissions no
   * longer match the project snapshot the permission check was made against.
   */
  private async cacheText(textDocId: TextDocId): Promise<void> {
    try {
      if (await this.permissionsService.canAccessTextAsync(textDocId)) {
        await this.projectService.getText(textDocId);
      }
    } catch (error) {
      console.warn(`Unable to cache text doc ${textDocId.toString()} for offline use`, error);
    }
  }
}

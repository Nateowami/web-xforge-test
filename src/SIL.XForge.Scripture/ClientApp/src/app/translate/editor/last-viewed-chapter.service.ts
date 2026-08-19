import { Injectable } from '@angular/core';

/**
 * Remembers the chapter the user last viewed in each book of each project, so that navigating back to a book can
 * resume at that chapter instead of starting over at the first chapter. The record lasts for as long as the app is
 * loaded in the browser.
 */
@Injectable({ providedIn: 'root' })
export class LastViewedChapterService {
  private readonly chapters = new Map<string, number>();

  set(projectId: string, bookNum: number, chapter: number): void {
    this.chapters.set(this.key(projectId, bookNum), chapter);
  }

  get(projectId: string, bookNum: number): number | undefined {
    return this.chapters.get(this.key(projectId, bookNum));
  }

  private key(projectId: string, bookNum: number): string {
    return `${projectId}:${bookNum}`;
  }
}

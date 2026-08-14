import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { translate } from '@ngneat/transloco';
import { slice } from 'lodash-es';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';
import { combineLatest } from 'rxjs';
import { AvatarComponent } from 'xforge-common/avatar/avatar.component';
import { Breakpoint, MediaBreakpointService } from 'xforge-common/media-breakpoints/media-breakpoint.service';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
export interface MultiCursorViewer extends UserProfile {
  cursorColor: string;
  activeInEditor: boolean;
}

@Component({
  selector: 'app-multi-viewer',
  templateUrl: './multi-viewer.component.html',
  styleUrls: ['./multi-viewer.component.scss'],
  imports: [MatTooltip, AvatarComponent, MatMiniFabButton, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem]
})
export class MultiViewerComponent implements OnChanges, OnInit {
  @Input() viewers: MultiCursorViewer[] = [];
  @Output() viewerClick: EventEmitter<MultiCursorViewer> = new EventEmitter<MultiCursorViewer>();
  maxAvatars: number = 3;
  isMenuOpen: boolean = false;

  constructor(
    private readonly breakpointObserver: BreakpointObserver,
    private readonly breakpointService: MediaBreakpointService,
    private destroyRef: DestroyRef
  ) {}

  /** Whether there are more viewers than can be shown as avatars, so the overflow menu is needed. */
  get hasOverflowMenu(): boolean {
    return this.viewers.length > this.maxAvatars;
  }

  get avatarViewers(): MultiCursorViewer[] {
    if (this.isMenuOpen) return [];

    return this.hasOverflowMenu ? slice(this.viewers, 0, this.maxAvatars - 1) : this.viewers;
  }

  get otherViewersLabel(): string {
    return translate('multi_viewer.other_viewers', { count: this.viewers.length });
  }

  ngOnChanges(): void {
    this.closeMenuIfNotShown();
  }

  ngOnInit(): void {
    combineLatest([
      this.breakpointObserver.observe(this.breakpointService.width('>', Breakpoint.SM)),
      this.breakpointObserver.observe(this.breakpointService.width('<=', Breakpoint.XS))
    ])
      .pipe(quietTakeUntilDestroyed(this.destroyRef))
      .subscribe(([bigger, xs]) => {
        // initialize to 3, but if > SM then set to 6, else if <= XS then set to 1
        this.maxAvatars = bigger.matches ? 6 : xs.matches ? 1 : 3;
        this.closeMenuIfNotShown();
      });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  clickAvatar(viewer: MultiCursorViewer): void {
    this.viewerClick.emit(viewer);
  }

  /**
   * The menu and the button that opens it are removed as soon as all the viewers fit as avatars, which happens when
   * the window is made wider or a viewer leaves. Material does not emit `closed` for a menu that is destroyed while
   * open, so the flag has to be reset here or the avatars stay hidden with no way to bring them back.
   */
  private closeMenuIfNotShown(): void {
    if (!this.hasOverflowMenu) {
      this.isMenuOpen = false;
    }
  }
}

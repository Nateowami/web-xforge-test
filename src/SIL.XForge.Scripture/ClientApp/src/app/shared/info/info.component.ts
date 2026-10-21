import { Component, DestroyRef, ElementRef, Inject, Input, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { filter, fromEvent } from 'rxjs';
import { DOCUMENT } from 'xforge-common/browser-globals';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { ICONS_TO_MIRROR_RTL } from '../utils';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [MatTooltip, MatIcon]
})
export class InfoComponent implements OnInit {
  @Input() icon?: string = 'help';
  @Input() type: 'normal' | 'warning' | 'error' = 'normal';
  @Input() text: string = '';

  @ViewChild(MatTooltip) private tooltip?: MatTooltip;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly destroyRef: DestroyRef,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  get mirrorRTL(): boolean {
    return ICONS_TO_MIRROR_RTL.has(this.icon);
  }

  ngOnInit(): void {
    // A tooltip opened by tapping stays open until the next tap, and MatTooltip only follows the window and containers
    // marked cdkScrollable. Close the tooltip when anything containing this icon scrolls, so it is not left floating
    // over unrelated content.
    this.ngZone.runOutsideAngular(() =>
      fromEvent(this.document, 'scroll', { capture: true, passive: true })
        .pipe(
          // Check visibility first: it is cheap and usually false, and every app-info on the page sees each scroll.
          filter(event => this.tooltip?._isTooltipVisible() === true && this.isScrollAncestor(event.target)),
          quietTakeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => this.ngZone.run(() => this.tooltip?.hide(0)))
    );
  }

  private isScrollAncestor(target: EventTarget | null): boolean {
    return target instanceof Node && target.contains(this.elementRef.nativeElement);
  }
}

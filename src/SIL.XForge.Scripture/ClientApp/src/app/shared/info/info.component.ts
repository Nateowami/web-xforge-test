import { DOCUMENT } from '@angular/common';
import { Component, inject, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { ICONS_TO_MIRROR_RTL } from '../utils';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  imports: [MatTooltip, MatIcon]
})
export class InfoComponent implements OnDestroy {
  @Input() icon?: string = 'help';
  @Input() type: 'normal' | 'warning' | 'error' = 'normal';
  @Input() text: string = '';

  @ViewChild(MatTooltip) private readonly tooltip?: MatTooltip;

  private readonly document = inject(DOCUMENT);
  private readonly ngZone = inject(NgZone);

  constructor() {}

  get mirrorRTL(): boolean {
    return ICONS_TO_MIRROR_RTL.has(this.icon);
  }

  /**
   * Shows the tooltip. Tapping the icon is the only way to see the tooltip on a touch device, but a tap leaves no
   * pointer hovering the icon, so nothing ends the tooltip the way moving the mouse away does. Dismiss it when the
   * user scrolls; otherwise it stays on screen while the page scrolls away underneath it.
   */
  showTooltip(): void {
    this.tooltip?.show();
    // The listener is registered outside the Angular zone, and removes itself once it has fired, so that scrolling
    // doesn't repeatedly trigger change detection.
    this.ngZone.runOutsideAngular(() =>
      this.document.addEventListener('scroll', this.hideTooltip, { capture: true, passive: true, once: true })
    );
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('scroll', this.hideTooltip, { capture: true });
  }

  private readonly hideTooltip = (): void => this.ngZone.run(() => this.tooltip?.hide(0));
}

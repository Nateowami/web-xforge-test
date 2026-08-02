import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-font-size',
  templateUrl: './font-size.component.html',
  styleUrls: ['./font-size.component.scss'],
  imports: [TranslocoModule, MatIconButton, MatMenuTrigger, NgClass, MatTooltip, MatIcon, MatMenu, MatMenuItem]
})
export class FontSizeComponent implements OnInit {
  @Input() min: number = 1;
  @Input() max: number = 3;
  /** Emitted when the user adjusts the size, so that the caller can apply and persist it. */
  @Output() fontSizeChange = new EventEmitter<number>();

  step: number = 0.1;

  private _fontSize: number = 1;
  get fontSize(): number {
    return this._fontSize;
  }
  /** The font size, as a multiple of the default size. */
  @Input() set fontSize(value: number | undefined) {
    this._fontSize = this.cropToBounds(value ?? 1);
  }

  constructor() {}

  ngOnInit(): void {
    if (this.min > this.max) {
      throw new RangeError(`min (${this.min}) can not be larger than max (${this.max})`);
    }

    // Re-apply the bounds, in case they were set after the font size
    this.fontSize = this._fontSize;
  }

  adjustFontSize($event: Event, direction: 1 | -1): void {
    this.fontSize += direction * this.step;
    this.fontSizeChange.emit(this.fontSize);

    // Ensure focus removed from element if disabled (firefox doesn't)
    if (this.fontSize === this.min || this.fontSize === this.max) {
      ($event.target as HTMLElement).closest('button')?.blur();
    }

    // Allows menu to stay open
    $event.stopPropagation();
  }

  private cropToBounds(fontSize: number): number {
    // Round, as repeatedly adding the step accumulates floating point error, which would be persisted
    const rounded = Math.round(fontSize * 100) / 100;
    return Math.min(Math.max(rounded, this.min), this.max);
  }
}

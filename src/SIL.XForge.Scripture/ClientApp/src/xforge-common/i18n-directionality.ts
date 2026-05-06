import { Direction, Directionality } from '@angular/cdk/bidi';
import { EventEmitter, Injectable, OnDestroy } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * A reactive replacement for Angular CDK's root-level {@link Directionality} service. The default CDK
 * {@link Directionality} reads `body.dir` only once at construction time, which means it becomes stale if the
 * locale changes after initialization. This implementation subscribes to {@link I18nService.locale$} and updates
 * dynamically, fixing visual bugs in dialogs and other CDK overlays when switching between RTL and LTR languages.
 */
@Injectable()
export class I18nDirectionality implements OnDestroy {
  value: Direction;
  readonly change = new EventEmitter<Direction>();

  constructor(i18n: I18nService) {
    this.value = i18n.direction;
    i18n.locale$.subscribe(locale => {
      const newDir = locale.direction;
      if (newDir !== this.value) {
        this.value = newDir;
        this.change.next(newDir);
      }
    });
  }

  ngOnDestroy(): void {
    this.change.complete();
  }
}

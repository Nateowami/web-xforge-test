import { Direction, Directionality } from '@angular/cdk/bidi';
import { EventEmitter, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Subscription } from 'rxjs';
import { I18nService } from './i18n.service';

/**
 * A reactive replacement for Angular CDK's root-level {@link Directionality} service. The default CDK
 * {@link Directionality} reads `body.dir` only once at construction time, which means it becomes stale if the
 * locale changes after initialization. This implementation subscribes to {@link I18nService.locale$} and updates
 * dynamically, fixing visual bugs in dialogs and other CDK overlays when switching between RTL and LTR languages.
 */
@Injectable()
export class I18nDirectionality implements OnDestroy {
  readonly valueSignal: WritableSignal<Direction>;
  readonly change = new EventEmitter<Direction>();

  get value(): Direction {
    return this.valueSignal();
  }

  private readonly subscription: Subscription;

  constructor(i18n: I18nService) {
    this.valueSignal = signal<Direction>(i18n.direction);
    this.subscription = i18n.locale$.subscribe(locale => {
      const newDir = locale.direction;
      if (newDir !== this.valueSignal()) {
        this.valueSignal.set(newDir);
        this.change.next(newDir);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.change.complete();
  }
}

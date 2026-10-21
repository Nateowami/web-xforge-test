import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { InfoComponent } from './info.component';

describe('InfoComponent', () => {
  it('shows the tooltip when the icon is clicked', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickIcon();
    expect(env.isTooltipVisible).toBe(true);
    env.closeTooltip();
  }));

  it('hides the tooltip when a container of the icon scrolls', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickIcon();
    expect(env.isTooltipVisible).toBe(true);

    env.scroll(env.scrollContainer);
    expect(env.isTooltipVisible).toBe(false);
  }));

  it('keeps the tooltip open when an unrelated element scrolls', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickIcon();

    env.scroll(env.otherScrollContainer);
    expect(env.isTooltipVisible).toBe(true);
    env.closeTooltip();
  }));
});

@Component({
  template: `
    <div class="scroll-container" style="height: 50px; overflow-y: auto">
      <div style="height: 200px"><app-info text="Help text"></app-info></div>
    </div>
    <div class="other-scroll-container" style="height: 50px; overflow-y: auto">
      <div style="height: 200px"></div>
    </div>
  `,
  imports: [InfoComponent]
})
class HostComponent {}

class TestEnvironment {
  readonly fixture: ComponentFixture<HostComponent>;

  constructor() {
    TestBed.configureTestingModule({
      imports: [HostComponent]
    });
    this.fixture = TestBed.createComponent(HostComponent);
    this.fixture.detectChanges();
  }

  get scrollContainer(): HTMLElement {
    return this.fixture.debugElement.query(By.css('.scroll-container')).nativeElement;
  }

  get otherScrollContainer(): HTMLElement {
    return this.fixture.debugElement.query(By.css('.other-scroll-container')).nativeElement;
  }

  get isTooltipVisible(): boolean {
    return this.tooltip._isTooltipVisible();
  }

  private get tooltip(): MatTooltip {
    return this.fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
  }

  clickIcon(): void {
    (this.fixture.debugElement.query(By.css('app-info a')).nativeElement as HTMLElement).click();
    this.wait();
  }

  scroll(element: HTMLElement): void {
    element.dispatchEvent(new Event('scroll'));
    this.wait();
  }

  closeTooltip(): void {
    this.tooltip.hide(0);
    this.wait();
  }

  private wait(): void {
    flush();
    this.fixture.detectChanges();
  }
}

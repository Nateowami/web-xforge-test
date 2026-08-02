import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { configureTestingModule } from 'xforge-common/test-utils';
import { InfoComponent } from './info.component';

const infoText = 'Information about the thing';

describe('InfoComponent', () => {
  configureTestingModule(() => ({
    imports: [InfoComponent],
    providers: [provideNoopAnimations()]
  }));

  let fixture: ComponentFixture<InfoComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoComponent);
    fixture.componentInstance.text = infoText;
    fixture.detectChanges();
  });

  it('shows the tooltip when the icon is clicked', fakeAsync(() => {
    expect(tooltipText()).not.toContain(infoText);

    clickIcon();

    expect(tooltipText()).toContain(infoText);
    cleanUp();
  }));

  it('hides the tooltip when the page is scrolled', fakeAsync(() => {
    clickIcon();
    expect(tooltipText()).toContain(infoText);

    document.dispatchEvent(new Event('scroll'));
    tick();
    fixture.detectChanges();

    expect(tooltipText()).not.toContain(infoText);
    cleanUp();
  }));

  function clickIcon(): void {
    (fixture.debugElement.query(By.css('a')).nativeElement as HTMLElement).click();
    fixture.detectChanges();
    tick();
  }

  function tooltipText(): string {
    return TestBed.inject(OverlayContainer).getContainerElement().textContent ?? '';
  }

  function cleanUp(): void {
    fixture.destroy();
    flush();
  }
});

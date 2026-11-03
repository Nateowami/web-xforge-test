import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { TestBreakpointObserver } from 'xforge-common/test-breakpoint-observer';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { MultiCursorViewer, MultiViewerComponent } from './multi-viewer.component';

describe('MultiViewerComponent', () => {
  let component: MultiViewerComponent;
  let fixture: ComponentFixture<MultiViewerComponent>;

  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [{ provide: BreakpointObserver, useClass: TestBreakpointObserver }]
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have all avatars when the menu is closed', () => {
    component.viewers = [
      { displayName: 'v 1', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 2', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 3', avatarUrl: '', cursorColor: '', activeInEditor: false }
    ];
    expect(component.maxAvatars).withContext('setup').toEqual(3);

    expect(component.avatarViewers.length).toEqual(3);
  });

  it('should not have avatars when the menu is open', () => {
    component.viewers = [
      { displayName: 'v 1', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 2', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 3', avatarUrl: '', cursorColor: '', activeInEditor: false }
    ];

    component.isMenuOpen = true;

    expect(component.avatarViewers.length).toEqual(0);
  });

  it('should limit the avatars when there are many', () => {
    component.viewers = [
      { displayName: 'v 1', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 2', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 3', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 4', avatarUrl: '', cursorColor: '', activeInEditor: false }
    ];
    expect(component.maxAvatars).withContext('setup').toEqual(3);

    expect(component.avatarViewers.length).toEqual(2);
  });

  it('should toggle the menu', () => {
    expect(component.isMenuOpen).withContext('setup').toBeFalse();

    component.toggleMenu();

    expect(component.isMenuOpen).toBeTrue();

    component.toggleMenu();

    expect(component.isMenuOpen).toBeFalse();
  });

  it('should close the menu', () => {
    component.isMenuOpen = true;
    expect(component.isMenuOpen).withContext('setup').toBeTrue();

    component.closeMenu();

    expect(component.isMenuOpen).toBeFalse();
  });

  it('should count only the viewers without an avatar in the tooltip of the overflow button', () => {
    component.viewers = createViewers(5);
    fixture.detectChanges();
    expect(component.maxAvatars).withContext('setup').toEqual(3);
    expect(component.avatarViewers.length).withContext('setup').toEqual(2);

    const overflowButton = fixture.debugElement.query(By.css('button[mat-mini-fab]'));
    expect(overflowButton.nativeElement.textContent.replace(/\s/g, '')).toEqual('+3');
    expect(overflowButton.injector.get(MatTooltip).message).toEqual('3 other viewers');
    // The menu lists every viewer, so its heading still counts all of them
    expect(component.otherViewersLabel).toEqual('5 other viewers');
  });

  it('should match the tooltip to the overflow button count at each breakpoint', () => {
    component.viewers = createViewers(8);

    for (const [maxAvatars, expectedCount] of [
      [1, 8],
      [3, 6],
      [6, 3]
    ]) {
      component.maxAvatars = maxAvatars;
      expect(component.avatarViewers.length + component.hiddenViewerCount).toEqual(8);
      expect(component.hiddenViewerCount).toEqual(expectedCount);
      expect(component.hiddenViewersLabel).toEqual(`${expectedCount} other viewers`);
    }
  });
});

function createViewers(count: number): MultiCursorViewer[] {
  return Array.from({ length: count }, (_, i) => ({
    displayName: `v ${i + 1}`,
    avatarUrl: '',
    cursorColor: '',
    activeInEditor: false
  }));
}

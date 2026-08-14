import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestBreakpointObserver } from 'xforge-common/test-breakpoint-observer';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { MultiCursorViewer, MultiViewerComponent } from './multi-viewer.component';

describe('MultiViewerComponent', () => {
  let component: MultiViewerComponent;
  let fixture: ComponentFixture<MultiViewerComponent>;

  configureTestingModule(() => ({
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

  it('should show all avatars when the viewport grows while the menu is open', () => {
    // The menu, and the button that opens it, are destroyed when all the viewers fit as avatars
    component.viewers = [
      { displayName: 'v 1', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 2', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 3', avatarUrl: '', cursorColor: '', activeInEditor: false },
      { displayName: 'v 4', avatarUrl: '', cursorColor: '', activeInEditor: false }
    ];
    component.toggleMenu();
    expect(component.avatarViewers.length).withContext('setup').toEqual(0);

    (TestBed.inject(BreakpointObserver) as TestBreakpointObserver).emitObserveValue(true);

    expect(component.maxAvatars).withContext('max avatars').toEqual(6);
    expect(component.isMenuOpen).withContext('menu open').toBeFalse();
    expect(component.avatarViewers.length).toEqual(4);
  });
});

@Component({
  template: `<app-multi-viewer [viewers]="viewers"></app-multi-viewer>`,
  imports: [MultiViewerComponent]
})
class HostComponent {
  @ViewChild(MultiViewerComponent) multiViewer!: MultiViewerComponent;
  viewers: MultiCursorViewer[] = [];
}

function viewers(count: number): MultiCursorViewer[] {
  return Array.from({ length: count }, (_, i) => ({
    displayName: `v ${i + 1}`,
    avatarUrl: '',
    cursorColor: '',
    activeInEditor: false
  }));
}

describe('MultiViewerComponent in a host component', () => {
  let fixture: ComponentFixture<HostComponent>;

  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [{ provide: BreakpointObserver, useClass: TestBreakpointObserver }]
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
  });

  function avatarCount(): number {
    return fixture.nativeElement.querySelectorAll('.app-avatar-container app-avatar').length;
  }

  it('should show an avatar for each viewer', () => {
    fixture.componentInstance.viewers = viewers(3);
    fixture.detectChanges();

    expect(avatarCount()).toEqual(3);
  });

  it('should show the remaining avatars when a viewer leaves while the menu is open', () => {
    fixture.componentInstance.viewers = viewers(4);
    fixture.detectChanges();
    fixture.componentInstance.multiViewer.toggleMenu();
    fixture.detectChanges();
    expect(avatarCount()).withContext('setup').toEqual(0);

    // A viewer leaves, so the overflow button and its menu are no longer shown
    fixture.componentInstance.viewers = viewers(3);
    fixture.detectChanges();

    expect(fixture.componentInstance.multiViewer.isMenuOpen).withContext('menu open').toBeFalse();
    expect(avatarCount()).toEqual(3);
  });
});

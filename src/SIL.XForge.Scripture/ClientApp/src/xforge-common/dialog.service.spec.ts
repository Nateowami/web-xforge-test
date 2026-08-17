import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { DialogService } from './dialog.service';
import { configureTestingModule, getTestTranslocoModule } from './test-utils';

@Component({ template: '<p>page</p>' })
class PageComponent {}

describe('DialogService', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule()],
    providers: [
      provideNoopAnimations(),
      provideRouter([
        { path: 'a', component: PageComponent },
        { path: 'b', component: PageComponent }
      ])
    ]
  }));

  it('closes open dialogs when the app navigates to another page', fakeAsync(() => {
    const env = new TestEnvironment();
    env.service.openMatDialog(PageComponent);
    expect(env.service.openDialogCount).toEqual(1);

    env.navigate('/b');
    expect(env.service.openDialogCount).toEqual(0);
  }));

  it('leaves dialogs open when only the query string or fragment changes', fakeAsync(() => {
    const env = new TestEnvironment();
    env.service.openMatDialog(PageComponent);
    expect(env.service.openDialogCount).toEqual(1);

    env.navigate('/a?scope=book');
    expect(env.service.openDialogCount).toEqual(1);

    env.navigate('/a?scope=chapter#verse');
    expect(env.service.openDialogCount).toEqual(1);

    env.closeAllDialogs();
  }));
});

class TestEnvironment {
  readonly service: DialogService = TestBed.inject(DialogService);
  private readonly router: Router = TestBed.inject(Router);

  constructor() {
    this.navigate('/a');
  }

  navigate(url: string): void {
    this.router.navigateByUrl(url);
    tick();
  }

  /** Keeps the overlay container clean, which configureTestingModule checks for. */
  closeAllDialogs(): void {
    TestBed.inject(MatDialog).closeAll();
    tick();
  }
}

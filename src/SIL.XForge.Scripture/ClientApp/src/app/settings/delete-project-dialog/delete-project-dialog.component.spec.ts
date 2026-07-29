import { ComponentFixture, fakeAsync, flush, inject, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { OnlineStatusService } from 'xforge-common/online-status.service';
import { provideTestOnlineStatus } from 'xforge-common/test-online-status-providers';
import { TestOnlineStatusService } from 'xforge-common/test-online-status.service';
import { ChildViewContainerComponent, configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { DeleteProjectDialogComponent } from './delete-project-dialog.component';

describe('DeleteProjectDialogComponent', () => {
  configureTestingModule(() => ({
    imports: [getTestTranslocoModule(), DeleteProjectDialogComponent],
    providers: [provideTestOnlineStatus(), { provide: OnlineStatusService, useClass: TestOnlineStatusService }]
  }));

  let dialog: MatDialog;
  let viewContainerFixture: ComponentFixture<ChildViewContainerComponent>;

  it('should allow user to delete the project', fakeAsync(() => {
    const env = new TestEnvironment();
    // Project name matching is case insensitive
    env.inputValue(env.projectInput, 'PrOjEcT01');
    expect(env.component.deleteDisabled).toBe(false);
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('accept');
  }));

  it('should not delete the project if project name does not match', fakeAsync(() => {
    const env = new TestEnvironment();
    env.inputValue(env.projectInput, 'project02');
    expect(env.component.deleteDisabled).toBe(true);
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledTimes(0);
    env.clickElement(env.cancelButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('cancel');
  }));

  it('should not allow the project to be deleted while offline', fakeAsync(() => {
    const env = new TestEnvironment();
    env.inputValue(env.projectInput, 'project01');
    expect(env.component.deleteDisabled).toBe(false);
    expect(env.offlineNotice).toBeNull();

    env.setOnline(false);
    expect(env.component.deleteDisabled).toBe(true);
    expect(env.offlineNotice).not.toBeNull();
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledTimes(0);

    // The user can delete once back online, without having to re-enter the project name
    env.setOnline(true);
    expect(env.component.deleteDisabled).toBe(false);
    expect(env.offlineNotice).toBeNull();
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('accept');
  }));

  it('should allow user to cancel', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickElement(env.cancelButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('cancel');
  }));

  class TestEnvironment {
    fixture: ComponentFixture<ChildViewContainerComponent>;
    component: DeleteProjectDialogComponent;
    dialogRef: MatDialogRef<DeleteProjectDialogComponent>;

    afterCloseCallback: jasmine.Spy;

    constructor() {
      this.afterCloseCallback = jasmine.createSpy('afterClose callback');
      const config: MatDialogConfig = { data: { name: 'project01' } };
      this.dialogRef = dialog.open(DeleteProjectDialogComponent, config);
      this.dialogRef.afterClosed().subscribe(this.afterCloseCallback);
      this.component = this.dialogRef.componentInstance;
      this.fixture = viewContainerFixture;
      this.fixture.detectChanges();
    }

    get overlayContainerElement(): HTMLElement {
      return this.fixture.nativeElement.parentElement.querySelector('.cdk-overlay-container');
    }

    get deleteButton(): HTMLElement {
      return this.overlayContainerElement.querySelector('#project-delete-btn') as HTMLElement;
    }

    get cancelButton(): HTMLElement {
      return this.overlayContainerElement.querySelector('#cancel-btn') as HTMLElement;
    }

    get projectInput(): HTMLElement {
      return this.overlayContainerElement.querySelector('#project-entry') as HTMLElement;
    }

    get offlineNotice(): HTMLElement | null {
      return this.overlayContainerElement.querySelector('#offline-notice');
    }

    setOnline(isOnline: boolean): void {
      (TestBed.inject(OnlineStatusService) as TestOnlineStatusService).setIsOnline(isOnline);
      this.fixture.detectChanges();
      tick();
    }

    inputValue(element: HTMLElement, value: string): void {
      const inputElem = element.querySelector('input') as HTMLInputElement;
      inputElem.value = value;
      inputElem.dispatchEvent(new Event('input'));
      this.fixture.detectChanges();
      tick();
    }

    clickElement(element: HTMLElement): void {
      element.click();
      this.fixture.detectChanges();
      tick();
    }
  }

  beforeEach(inject([MatDialog], (d: MatDialog) => {
    dialog = d;
  }));

  beforeEach(() => {
    viewContainerFixture = TestBed.createComponent(ChildViewContainerComponent);
  });
});

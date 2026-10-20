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

  it('should not allow deleting the project while offline', fakeAsync(() => {
    const env = new TestEnvironment();
    expect(env.offlineMessage).toBeNull();
    env.inputValue(env.projectInput, 'project01');
    expect(env.component.deleteDisabled).toBe(false);

    // The dialog was opened while online and the connection dropped afterwards
    env.setOnline(false);
    expect(env.component.deleteDisabled).toBe(true);
    expect(env.offlineMessage).not.toBeNull();
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).not.toHaveBeenCalled();

    env.setOnline(true);
    expect(env.component.deleteDisabled).toBe(false);
    expect(env.offlineMessage).toBeNull();
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
    readonly testOnlineStatusService = TestBed.inject(OnlineStatusService) as TestOnlineStatusService;

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

    get offlineMessage(): HTMLElement | null {
      return this.overlayContainerElement.querySelector('#offline-message');
    }

    get projectInput(): HTMLElement {
      return this.overlayContainerElement.querySelector('#project-entry') as HTMLElement;
    }

    inputValue(element: HTMLElement, value: string): void {
      const inputElem = element.querySelector('input') as HTMLInputElement;
      inputElem.value = value;
      inputElem.dispatchEvent(new Event('input'));
      this.fixture.detectChanges();
      tick();
    }

    setOnline(isOnline: boolean): void {
      this.testOnlineStatusService.setIsOnline(isOnline);
      tick();
      this.fixture.detectChanges();
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

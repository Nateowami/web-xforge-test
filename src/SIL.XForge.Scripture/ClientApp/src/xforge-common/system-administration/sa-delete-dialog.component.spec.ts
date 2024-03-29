import { MdcDialog, MdcDialogConfig, MdcDialogRef } from '@angular-mdc/web/dialog';
import { CommonModule } from '@angular/common';
import { DebugElement, NgModule } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SystemRole } from 'realtime-server/lib/esm/common/models/system-role';
import { AvatarTestingModule } from '../avatar/avatar-testing.module';
import { ChildViewContainerComponent, configureTestingModule } from '../test-utils';
import { UICommonModule } from '../ui-common.module';
import { SaDeleteDialogComponent, SaDeleteUserDialogData } from './sa-delete-dialog.component';

describe('DeleteDialogComponent', () => {
  configureTestingModule(() => ({
    imports: [TestModule]
  }));

  it('Confirm Delete button call', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickElement(env.deleteButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('confirmed');
  }));

  it('Confirm Cancel button call', fakeAsync(() => {
    const env = new TestEnvironment();
    env.clickElement(env.cancelButton);
    flush();
    expect(env.afterCloseCallback).toHaveBeenCalledWith('close');
  }));
});

@NgModule({
  imports: [AvatarTestingModule, CommonModule, UICommonModule],
  declarations: [SaDeleteDialogComponent],
  exports: [SaDeleteDialogComponent]
})
class TestModule {}

class TestEnvironment {
  component: SaDeleteDialogComponent;
  fixture: ComponentFixture<ChildViewContainerComponent>;
  dialogRef: MdcDialogRef<SaDeleteDialogComponent>;
  afterCloseCallback: jasmine.Spy;

  constructor() {
    this.fixture = TestBed.createComponent(ChildViewContainerComponent);
    const viewContainerRef = this.fixture.componentInstance.childViewContainer;
    const config: MdcDialogConfig<SaDeleteUserDialogData> = {
      viewContainerRef,
      data: {
        user: {
          name: 'Billy T James',
          displayName: 'Billy T James',
          isDisplayNameConfirmed: true,
          email: 'user01@example.com',
          avatarUrl: '',
          authId: 'auth01',
          role: SystemRole.User,
          sites: {}
        }
      }
    };
    this.dialogRef = TestBed.inject(MdcDialog).open(SaDeleteDialogComponent, config);
    this.afterCloseCallback = jasmine.createSpy('afterClose callback');
    this.dialogRef.afterClosed().subscribe(this.afterCloseCallback);
    this.component = this.dialogRef.componentInstance;
    this.fixture.detectChanges();
  }

  get cancelButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#confirm-button-no'));
  }

  get deleteButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#confirm-button-yes'));
  }

  clickElement(element: HTMLElement | DebugElement): void {
    if (element instanceof DebugElement) {
      element = (element as DebugElement).nativeElement as HTMLElement;
    }

    element.click();
    this.fixture.detectChanges();
    flush();
  }
}

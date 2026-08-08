import { Component } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { capture, instance, mock, when } from 'ts-mockito';
import { DialogService } from './dialog.service';
import { I18nService } from './i18n.service';

@Component({ template: '' })
class TestDialogComponent {}

describe('DialogService', () => {
  it('uses the disableClose from the config', () => {
    const env = new TestEnvironment();
    env.service.openMatDialog(TestDialogComponent, { disableClose: true });
    expect(env.lastConfig.disableClose).toBe(true);
  });

  it('defaults disableClose to false when the config does not specify it', () => {
    const env = new TestEnvironment();
    env.service.openMatDialog(TestDialogComponent, { width: '600px' });
    expect(env.lastConfig.disableClose).toBe(false);
  });

  it('uses the disableClose argument when the config does not specify it', () => {
    const env = new TestEnvironment();
    env.service.openMatDialog(TestDialogComponent, { width: '600px' }, true);
    expect(env.lastConfig.disableClose).toBe(true);
  });
});

class TestEnvironment {
  readonly mockedMatDialog = mock(MatDialog);
  readonly mockedI18nService = mock(I18nService);
  readonly service: DialogService;

  constructor() {
    when(this.mockedI18nService.direction).thenReturn('ltr');
    this.service = new DialogService(instance(this.mockedI18nService), instance(this.mockedMatDialog));
  }

  get lastConfig(): MatDialogConfig {
    const [, config] = capture<any, MatDialogConfig>(this.mockedMatDialog.open).last();
    return config;
  }
}

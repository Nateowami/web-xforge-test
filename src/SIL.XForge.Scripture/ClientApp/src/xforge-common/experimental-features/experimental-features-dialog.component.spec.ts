import { OverlayContainer } from '@angular/cdk/overlay';
import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { mock, when } from 'ts-mockito';
import { ChildViewContainerComponent, configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { FeatureFlag } from '../feature-flags/feature-flag.service';
import { ExperimentalFeaturesDialogComponent } from './experimental-features-dialog.component';
import { ExperimentalFeature, ExperimentalFeaturesService } from './experimental-features.service';

const mockedExperimentalFeaturesService = mock(ExperimentalFeaturesService);

describe('ExperimentalFeaturesDialogComponent', () => {
  configureTestingModule(() => ({
    imports: [ExperimentalFeaturesDialogComponent, getTestTranslocoModule()],
    providers: [{ provide: ExperimentalFeaturesService, useMock: mockedExperimentalFeaturesService }]
  }));

  let overlayContainer: OverlayContainer;

  beforeEach(() => {
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    // Prevents 'Error: Test did not clean up its overlay container content.'
    overlayContainer.ngOnDestroy();
  });

  it('Shows available experimental features and whether they are editable', fakeAsync(() => {
    const env = new TestEnvironment();

    expect(env.getFeatureNameText(0)).toBe('Feature A');
    expect(env.getMatCheckbox(0).disabled).toBeFalsy();
    expect(env.getMatCheckbox(0).checked).toBeTruthy();

    expect(env.getFeatureNameText(1)).toBe('Feature B');
    expect(env.getMatCheckbox(1).disabled).toBeTruthy();
    expect(env.getMatCheckbox(1).checked).toBeFalsy();

    expect(env.getDescriptionText(0)).toBe('Description A');
    expect(env.getDescriptionText(1)).toBe('Description B');
  }));
});

class TestEnvironment {
  private readonly fixture: ComponentFixture<ChildViewContainerComponent>;

  constructor() {
    const features: ExperimentalFeature[] = [
      {
        name: 'Feature A',
        description: 'Description A',
        available: () => true,
        featureFlag: {
          key: 'FEATURE_A',
          description: 'Feature A',
          position: 0,
          readonly: false,
          enabled: true
        } as FeatureFlag
      },
      {
        name: 'Feature B',
        description: 'Description B',
        available: () => true,
        featureFlag: {
          key: 'FEATURE_B',
          description: 'Feature B',
          position: 1,
          readonly: true,
          enabled: false
        } as FeatureFlag
      }
    ];

    when(mockedExperimentalFeaturesService.availableExperimentalFeatures).thenReturn(features);

    this.fixture = TestBed.createComponent(ChildViewContainerComponent);
    const config: MatDialogConfig = {
      viewContainerRef: this.fixture.componentInstance.childViewContainer
    };

    // SUT
    TestBed.inject(MatDialog).open(ExperimentalFeaturesDialogComponent, config);

    tick();
    this.fixture.detectChanges();
    flush();
  }

  get overlayContainerElement(): HTMLElement {
    return this.fixture.nativeElement.parentElement.querySelector('.cdk-overlay-container');
  }

  get checkboxes(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.directive(MatCheckbox));
  }

  get featureNames(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('.feature-name'));
  }

  get descriptions(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('.feature-description'));
  }

  getFeatureNameText(i: number): string {
    return this.featureNames[i].nativeElement.textContent?.trim();
  }

  getMatCheckbox(i: number): MatCheckbox {
    return this.checkboxes[i].injector.get(MatCheckbox);
  }

  getDescriptionText(i: number): string {
    return this.descriptions[i].nativeElement.textContent?.trim();
  }
}

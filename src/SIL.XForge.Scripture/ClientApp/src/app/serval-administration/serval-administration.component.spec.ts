import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { configureTestingModule } from 'xforge-common/test-utils';
import { ServalAdministrationComponent } from './serval-administration.component';

describe('ServalAdministrationComponent', () => {
  configureTestingModule(() => ({
    providers: [provideRouter([{ path: 'serval-administration', component: ServalAdministrationComponent }])]
  }));

  beforeEach(() => {
    // The tab contents are not under test, so don't render them
    TestBed.overrideComponent(ServalAdministrationComponent, {
      set: { imports: [MatTabGroup, MatTab, MatTabContent], schemas: [NO_ERRORS_SCHEMA] }
    });
  });

  it('should be created', fakeAsync(() => {
    const env = new TestEnvironment('/serval-administration');
    expect(env.component).toBeTruthy();
    expect(env.component.selectedTabIndex).toBe(0);
  }));

  it('selects the tab from the URL', fakeAsync(() => {
    const env = new TestEnvironment('/serval-administration?tab=serval-builds&q=project01');
    expect(env.component.selectedTabIndex).toBe(2);
    expect(env.url).toBe('/serval-administration?tab=serval-builds&q=project01');
  }));

  it('does not carry query parameters over to another tab', fakeAsync(() => {
    const env = new TestEnvironment('/serval-administration?tab=serval-builds&q=project01');

    env.clickTab('Projects');
    expect(env.component.selectedTabIndex).toBe(0);
    expect(env.url).toBe('/serval-administration?tab=projects');

    env.clickTab('Onboarding Requests');
    expect(env.component.selectedTabIndex).toBe(3);
    expect(env.url).toBe('/serval-administration?tab=onboarding-requests');
  }));

  it('does not carry a project filter over to another tab', fakeAsync(() => {
    const env = new TestEnvironment('/serval-administration?tab=draft-jobs&projectId=project01');

    env.clickTab('Projects');
    expect(env.url).toBe('/serval-administration?tab=projects');
  }));

  it('keeps the query parameters when navigating to a tab while the page is open', fakeAsync(() => {
    const env = new TestEnvironment('/serval-administration?tab=projects');

    // Like the Serval Builds button on the Projects tab
    env.navigate('/serval-administration?tab=serval-builds&q=project01');
    expect(env.component.selectedTabIndex).toBe(2);
    expect(env.url).toBe('/serval-administration?tab=serval-builds&q=project01');
  }));

  class TestEnvironment {
    readonly harness: RouterTestingHarness;
    readonly component: ServalAdministrationComponent;
    private readonly router: Router = TestBed.inject(Router);

    constructor(url: string) {
      let harness: RouterTestingHarness | undefined;
      void RouterTestingHarness.create().then(h => (harness = h));
      flush();
      this.harness = harness!;
      let component: ServalAdministrationComponent | undefined;
      void this.harness.navigateByUrl(url, ServalAdministrationComponent).then(c => (component = c));
      this.settle();
      this.component = component!;
    }

    get url(): string {
      return this.router.url;
    }

    clickTab(label: string): void {
      const tabs: HTMLElement[] = Array.from(this.harness.routeNativeElement!.querySelectorAll('[role="tab"]'));
      const tab: HTMLElement | undefined = tabs.find(t => t.textContent?.trim() === label);
      if (tab == null) throw new Error(`Tab ${label} not found`);
      tab.click();
      this.settle();
    }

    navigate(url: string): void {
      void this.router.navigateByUrl(url);
      this.settle();
    }

    private settle(): void {
      // The tab group reports a selection change asynchronously, which can start another navigation
      for (let i = 0; i < 3; i++) {
        this.harness.detectChanges();
        flush();
      }
    }
  }
});

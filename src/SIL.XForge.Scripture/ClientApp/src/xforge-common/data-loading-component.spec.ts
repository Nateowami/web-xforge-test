import { Component } from '@angular/core';
import { instance, mock, resetCalls, verify } from 'ts-mockito';
import { DataLoadingComponent } from './data-loading-component';
import { NoticeService } from './notice.service';

/** A concrete component used to test DataLoadingComponent. Its loadingCallerId is a stable string literal for testing. */
@Component({
  selector: 'xf-test-loading',
  template: ''
})
class TestLoadingComponent extends DataLoadingComponent {
  readonly loadingCallerId = 'TestLoadingComponent';

  constructor(noticeService: NoticeService) {
    super(noticeService);
  }

  triggerLoadingStarted(): void {
    this.loadingStarted();
  }

  triggerLoadingFinished(): void {
    this.loadingFinished();
  }
}

describe('DataLoadingComponent', () => {
  it('uses the class name as caller ID rather than the constructor name', () => {
    const env = new TestEnvironment();

    // SUT
    const callerId: string = env.component.loadingCallerId;

    // The class name is a string literal that survives minification, unlike constructor.name
    expect(callerId).toBe('TestLoadingComponent');
    expect(callerId).not.toBe('xf-test-loading');
  });

  it('passes the class name to noticeService when loading starts', () => {
    const env = new TestEnvironment();

    // SUT
    env.component.triggerLoadingStarted();

    verify(env.mockedNoticeService.loadingStarted('TestLoadingComponent')).once();
  });

  it('passes the class name to noticeService when loading finishes', () => {
    const env = new TestEnvironment();
    env.component.triggerLoadingStarted();

    // SUT
    env.component.triggerLoadingFinished();

    verify(env.mockedNoticeService.loadingFinished('TestLoadingComponent')).once();
  });

  it('passes the class name when ngOnDestroy is called while loading', () => {
    const env = new TestEnvironment();
    env.component.triggerLoadingStarted();

    // SUT
    env.component.ngOnDestroy();

    verify(env.mockedNoticeService.loadingFinished('TestLoadingComponent')).once();
  });
});

/** Sets up the test environment for DataLoadingComponent tests. */
class TestEnvironment {
  readonly mockedNoticeService = mock(NoticeService);
  readonly component: TestLoadingComponent;

  constructor() {
    resetCalls(this.mockedNoticeService);
    this.component = new TestLoadingComponent(instance(this.mockedNoticeService));
  }
}

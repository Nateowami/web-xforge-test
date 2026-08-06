import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { createTestProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-test-data';
import { mock, when } from 'ts-mockito';
import { ActivatedProjectService } from 'xforge-common/activated-project.service';
import { configureTestingModule, getTestTranslocoModule } from 'xforge-common/test-utils';
import { SFProjectProfileDoc } from '../../core/models/sf-project-profile-doc';
import { FontUnsupportedMessageComponent } from './font-unsupported-message.component';

const mockedActivatedProjectService = mock(ActivatedProjectService);

describe('FontUnsupportedMessageComponent', () => {
  configureTestingModule(() => ({
    imports: [FontUnsupportedMessageComponent, getTestTranslocoModule()],
    providers: [{ provide: ActivatedProjectService, useMock: mockedActivatedProjectService }]
  }));

  it('warns about a font the browser cannot render', () => {
    const env = new TestEnvironment('Arial');
    expect(env.warning?.textContent).toContain('Arial');
  });

  it('does not warn when a font the browser can render is selected', () => {
    const env = new TestEnvironment('Charis SIL');
    expect(env.warning).toBeNull();
  });

  it('does not warn when the project has no font yet', () => {
    // A project that has not synced with Paratext yet has no font of its own, so there is nothing to warn about
    const env = new TestEnvironment(undefined);
    expect(env.warning).toBeNull();
  });
});

class TestEnvironment {
  readonly fixture: ComponentFixture<FontUnsupportedMessageComponent>;

  constructor(defaultFont: string | undefined) {
    const project: SFProjectProfile = createTestProjectProfile();
    project.defaultFont = defaultFont;
    when(mockedActivatedProjectService.projectDoc).thenReturn({ data: project } as SFProjectProfileDoc);

    this.fixture = TestBed.createComponent(FontUnsupportedMessageComponent);
    this.fixture.detectChanges();
  }

  get warning(): HTMLElement | null {
    return this.fixture.nativeElement.querySelector('app-notice');
  }
}

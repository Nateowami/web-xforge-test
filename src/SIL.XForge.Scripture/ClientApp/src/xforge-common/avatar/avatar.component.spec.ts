import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { createTestUserProfile } from 'realtime-server/lib/esm/common/models/user-test-data';
import { AvatarComponent, preferLocalAvatarFallback } from './avatar.component';

const GRAVATAR_WITH_AUTH0_FALLBACK =
  'https://s.gravatar.com/avatar/1234?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fjd.png';

describe('preferLocalAvatarFallback', () => {
  it('asks Gravatar for a 404 rather than the Auth0 placeholder', () => {
    expect(preferLocalAvatarFallback(GRAVATAR_WITH_AUTH0_FALLBACK)).toBe(
      'https://s.gravatar.com/avatar/1234?s=480&r=pg&d=404'
    );
  });

  it('leaves a Gravatar URL with a different fallback alone', () => {
    const url = 'https://www.gravatar.com/avatar/1234?d=https%3A%2F%2Fexample.com%2Fme.png';
    expect(preferLocalAvatarFallback(url)).toBe(url);
  });

  it('leaves URLs from other hosts alone', () => {
    const url = 'https://example.com/avatar/1234?d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fjd.png';
    expect(preferLocalAvatarFallback(url)).toBe(url);

    // a host that merely ends in the same characters is not Gravatar
    const lookalike = 'https://notgravatar.com/avatar/1234?d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fjd.png';
    expect(preferLocalAvatarFallback(lookalike)).toBe(lookalike);
  });

  it('leaves values that are not absolute URLs alone', () => {
    expect(preferLocalAvatarFallback('')).toBe('');
    expect(preferLocalAvatarFallback('/assets/avatar.png')).toBe('/assets/avatar.png');
  });
});

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AvatarComponent] });
    fixture = TestBed.createComponent(AvatarComponent);
  });

  it('requests the image without the Auth0 placeholder fallback', () => {
    fixture.componentInstance.user = createTestUserProfile({ avatarUrl: GRAVATAR_WITH_AUTH0_FALLBACK });
    fixture.detectChanges();

    const image: HTMLImageElement = fixture.debugElement.query(By.css('img')).nativeElement;
    expect(image.getAttribute('src')).toBe('https://s.gravatar.com/avatar/1234?s=480&r=pg&d=404');
  });

  it('falls back to initials when the image fails to load', () => {
    fixture.componentInstance.user = createTestUserProfile({
      displayName: 'John Doe',
      avatarUrl: GRAVATAR_WITH_AUTH0_FALLBACK
    });
    fixture.detectChanges();

    fixture.componentInstance.onImageError();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('img'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.initials')).nativeElement.textContent.trim()).toBe('JD');
  });
});

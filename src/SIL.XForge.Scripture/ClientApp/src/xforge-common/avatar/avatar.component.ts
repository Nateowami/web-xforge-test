import { Component, DoCheck, Input, OnChanges } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { UserProfile } from 'realtime-server/lib/esm/common/models/user';

type AvatarMode = 'image' | 'initials' | 'user_icon';

/** Prefix of the generic initials images that Auth0 uses when a user has no picture of their own. */
const AUTH0_PLACEHOLDER_AVATAR_URL = 'https://cdn.auth0.com/avatars/';

/**
 * Rewrites a Gravatar URL that falls back to an Auth0 placeholder so that Gravatar returns a 404
 * instead of redirecting to the placeholder. Gravatar serves such a fallback by redirecting through
 * a wp.com image proxy, so every user without a Gravatar costs three cross-origin requests instead
 * of one, and pages that show a lot of avatars get rate limited (HTTP 429). A 404 lets the avatar
 * fall back to the initials this component draws itself, which is what the placeholder shows anyway.
 */
export function preferLocalAvatarFallback(avatarUrl: string): string {
  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return avatarUrl;
  }
  const isGravatar = url.hostname === 'gravatar.com' || url.hostname.endsWith('.gravatar.com');
  if (!isGravatar || !url.searchParams.get('d')?.startsWith(AUTH0_PLACEHOLDER_AVATAR_URL)) {
    return avatarUrl;
  }
  url.searchParams.set('d', '404');
  return url.href;
}

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  imports: [MatIcon]
})
export class AvatarComponent implements DoCheck, OnChanges {
  @Input() size: number = 32;
  @Input() user?: UserProfile;
  @Input() borderColor: string = 'transparent';

  name?: string;
  avatarUrl?: string;
  imageUrl?: string;
  avatarColorFromDisplayName?: string;
  initials?: string;
  mode: AvatarMode = 'user_icon';
  imageLoadFailed: boolean = false;

  ngDoCheck(): void {
    if (this.name !== this.user?.displayName || this.avatarUrl !== this.user?.avatarUrl) {
      this.ngOnChanges();
    }
  }

  ngOnChanges(): void {
    this.name = this.user?.displayName;
    this.avatarUrl = this.user?.avatarUrl;
    this.imageUrl = this.avatarUrl == null ? undefined : preferLocalAvatarFallback(this.avatarUrl);
    this.mode = this.getMode();
  }

  getMode(): AvatarMode {
    if (this.avatarUrl && !this.imageLoadFailed) {
      return 'image';
    }

    this.avatarColorFromDisplayName = this.getAvatarColorFromDisplayName();
    this.initials = this.getInitials();

    if (this.initials != null) {
      return 'initials';
    }

    return 'user_icon';
  }

  getInitials(): string | undefined {
    if (this.name == null) {
      return undefined;
    }

    const characters = this.name
      .split(/\s+/) // Split on whitespace
      .filter(s => s.length > 0)
      .map(s => s[0])
      // filter out non-latin characters
      .filter(c => c.toUpperCase() !== c.toLowerCase());

    if (characters.length === 0) {
      return undefined;
    } else if (characters.length === 1) {
      return characters[0].toUpperCase();
    } else {
      return characters[0].toUpperCase() + characters[characters.length - 1].toUpperCase();
    }
  }

  /** Generates a hue (0 to 360) based on a hash of the user display name */
  getAvatarHueFromDisplayName(): number {
    if (this.name == null) {
      return 200; // Blue
    }

    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = (hash << 5) - hash + this.name.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    return Math.abs(hash) % 360;
  }

  getAvatarColorFromDisplayName(): string {
    return `hsl(${this.getAvatarHueFromDisplayName()}, 60%, 50%)`;
  }

  onImageError(): void {
    this.imageLoadFailed = true;
    this.mode = this.getMode();
  }
}

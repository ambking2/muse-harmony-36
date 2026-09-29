import type { Track } from "@/lib/types";

/**
 * What a shared playlist looks like on disk.
 *
 * `tracks` holds a full snapshot rather than the local `trackKeys`. A key is
 * just `source:id` — enough to find a track in the *owner's* library, and
 * useless on a device that has never seen it. Embedding the fields needed to
 * render (name, artists, album, artwork, url id) means a stranger can open the
 * link and hit play immediately, the same promise `/t/<key>` already makes.
 */
export interface StoredPlaylist {
  id: string;
  owner: string;
  name: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  tracks: Track[];
}

export interface UserRecord {
  username: string;
  /** PBKDF2-SHA256 over the password. Never the password itself. */
  passwordHash: string;
  /** Base64. */
  salt: string;
  createdAt: number;
  /**
   * SHA-256 of each recovery code. The codes themselves are shown once at
   * registration and never stored — there is nowhere to send them, since the
   * account has no email address.
   */
  recoveryHashes: string[];
}

/** What `/api/playlists` returns for a signed-in user. */
export interface PlaylistSummary {
  id: string;
  name: string;
  isPublic: boolean;
  updatedAt: number;
  count: number;
}

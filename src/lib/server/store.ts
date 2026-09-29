import type { LibraryDocument } from "../types";
import type { StoredPlaylist, UserRecord } from "./types";

/**
 * What the account store has to offer, whichever backend is behind it.
 *
 * Three exist, and the app runs the same against all of them: a SQLite file in
 * development, D1 and KV on the deployed worker. They differ in how records are
 * laid out and in what they can guarantee; they do not differ in what the rest
 * of the code can ask for.
 */
export interface Store {
  /* users */
  findUser(username: string): Promise<UserRecord | null>;
  /** False when the name is already taken. */
  createUser(user: UserRecord): Promise<boolean>;
  updateUser(
    username: string,
    patch: { passwordHash: string; salt: string; recoveryHashes: string[] },
  ): Promise<void>;

  /* sessions */
  getSession(sid: string): Promise<{ username: string; at: number } | null>;
  putSession(sid: string, username: string, at: number): Promise<void>;
  deleteSession(sid: string): Promise<void>;
  deleteSessionsFor(username: string): Promise<void>;

  /* library */
  /** The account's own library, or null if it has never been saved. */
  getLibrary(username: string): Promise<LibraryDocument | null>;
  saveLibrary(username: string, document: LibraryDocument): Promise<void>;

  /* playlists */
  findPlaylist(id: string): Promise<StoredPlaylist | null>;
  listPlaylistsByOwner(owner: string): Promise<StoredPlaylist[]>;
  insertPlaylist(playlist: StoredPlaylist): Promise<void>;
  updatePlaylist(playlist: StoredPlaylist): Promise<void>;
  /** False when the playlist is not there, or belongs to someone else. */
  deletePlaylist(id: string, owner: string): Promise<boolean>;

  /** Brings the backend up to date. Idempotent; runs once per process. */
  migrate(): Promise<void>;
}

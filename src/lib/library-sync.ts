/**
 * The library belongs to the account, not to the device.
 *
 * Playlists, favourites and history used to be a localStorage file, which meant
 * a new phone started empty and a borrowed browser kept whatever the last
 * person had been playing. With an account they travel with the name instead:
 * sign in on any device and the account's library is here.
 *
 * What does *not* travel is what genuinely belongs to the machine — downloaded
 * audio and its settings. The document is deliberately the same shape the store
 * already persists, so moving between device and account is a copy rather than
 * a conversion, and a new field in the app needs no migration here.
 *
 * The rule when both sides have something is the one worth stating out loud:
 * **the account wins**. A document is replaced, not merged, so a playlist
 * deleted on one device stays deleted on the next. The exception is a device
 * whose copy has never been saved, which is pushed up rather than dropped — that
 * is the case of someone who built a library before making an account, and
 * losing it would be the whole feature arriving one step too late.
 */
import { useEffect, useRef } from "react";

import { useLibrary } from "@/stores/library";
import type { LibraryDocument, Playlist, Track } from "./types";

/** Long enough to coalesce a burst, short enough that a tab close rarely loses one. */
const SAVE_AFTER_MS = 800;

export function emptyLibrary(): LibraryDocument {
  return {
    library: [],
    favorites: [],
    favoriteArtists: [],
    history: [],
    searchHistory: [],
    playlists: [],
    tracksById: {},
  };
}

function toDocument(): LibraryDocument {
  const s = useLibrary.getState();
  return {
    library: s.library,
    favorites: s.favorites,
    favoriteArtists: s.favoriteArtists,
    history: s.history,
    searchHistory: s.searchHistory,
    playlists: s.playlists,
    tracksById: s.tracksById,
  };
}

/** Whether there is anything worth pushing up from a device. */
function isEmpty(document: LibraryDocument): boolean {
  return (
    document.library.length === 0 &&
    document.favorites.length === 0 &&
    document.favoriteArtists.length === 0 &&
    document.playlists.length === 0 &&
    document.history.length === 0
  );
}

/** The account's document takes over the store, minus what is the device's. */
function adopt(document: LibraryDocument) {
  const local = useLibrary.getState();
  useLibrary.setState({
    library: document.library,
    favorites: document.favorites,
    favoriteArtists: document.favoriteArtists,
    history: document.history,
    searchHistory: document.searchHistory,
    playlists: document.playlists as Playlist[],
    // A track cache: entries only this device has are kept, because they are
    // just metadata and the account's copy of the same key is the same song.
    tracksById: { ...local.tracksById, ...document.tracksById } as Record<string, Track>,
  });
}

async function send(username: string, document: LibraryDocument): Promise<boolean> {
  try {
    const res = await fetch("/api/library", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ library: document }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function receive(username: string): Promise<LibraryDocument | null> {
  try {
    const res = await fetch("/api/library", { credentials: "same-origin" });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as {
      library?: LibraryDocument | null;
    } | null;
    return body?.library ?? null;
  } catch {
    return null;
  }
}

/**
 * Keeps the signed-in account's library and this device's library the same
 * thing. Call it once, near the root, with the signed-in name or null.
 */
export function useAccountLibrary(username: string | null): void {
  // Set while the account's copy is on its way in, so adopting it is not
  // mistaken for the user changing something.
  const adopting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!username) return;

    let live = true;

    const pull = async () => {
      adopting.current = true;
      try {
        const stored = await receive(username);
        if (!live) return;
        if (stored) {
          adopt(stored);
        } else if (!isEmpty(toDocument())) {
          // A library made before there was an account. Keep it, do not lose it
          // to a database that simply has not been told about it yet.
          await send(username, toDocument());
        }
      } finally {
        adopting.current = false;
      }
    };

    void pull();

    const schedule = () => {
      if (adopting.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void send(username, toDocument());
      }, SAVE_AFTER_MS);
    };

    const unsubscribe = useLibrary.subscribe(schedule);

    return () => {
      live = false;
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, [username]);
}

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DownloadItem, Playlist, Track } from "@/lib/types";
import { trackKey } from "@/lib/types";

interface LibraryState {
  library: Track[]; // saved tracks
  favorites: string[]; // trackKeys
  favoriteArtists: string[]; // artist names
  history: { key: string; at: number }[];
  searchHistory: string[];
  playlists: Playlist[];
  downloads: DownloadItem[];
  tracksById: Record<string, Track>;

  addToLibrary: (t: Track) => void;
  removeFromLibrary: (key: string) => void;
  toggleFavorite: (t: Track) => void;
  isFavorite: (key: string) => boolean;
  toggleFavoriteArtist: (name: string) => void;
  pushHistory: (t: Track) => void;
  pushSearch: (q: string) => void;
  clearSearchHistory: () => void;

  createPlaylist: (name: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, t: Track) => void;
  removeFromPlaylist: (id: string, key: string) => void;
  reorderPlaylist: (id: string, from: number, to: number) => void;

  addDownload: (d: DownloadItem) => void;
  updateDownload: (id: string, patch: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
}

function ensureTrack(state: LibraryState, t: Track) {
  state.tracksById[trackKey(t)] = t;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      library: [],
      favorites: [],
      favoriteArtists: [],
      history: [],
      searchHistory: [],
      playlists: [],
      downloads: [],
      tracksById: {},

      addToLibrary: (t) =>
        set((s) => {
          const k = trackKey(t);
          if (s.library.some((x) => trackKey(x) === k)) return s;
          const tracksById = { ...s.tracksById, [k]: t };
          return { library: [t, ...s.library], tracksById };
        }),
      removeFromLibrary: (key) =>
        set((s) => ({ library: s.library.filter((x) => trackKey(x) !== key) })),

      toggleFavorite: (t) =>
        set((s) => {
          const k = trackKey(t);
          const has = s.favorites.includes(k);
          return {
            favorites: has ? s.favorites.filter((x) => x !== k) : [k, ...s.favorites],
            tracksById: { ...s.tracksById, [k]: t },
          };
        }),
      isFavorite: (key) => get().favorites.includes(key),

      toggleFavoriteArtist: (name) =>
        set((s) => ({
          favoriteArtists: s.favoriteArtists.includes(name)
            ? s.favoriteArtists.filter((x) => x !== name)
            : [name, ...s.favoriteArtists],
        })),

      pushHistory: (t) =>
        set((s) => {
          const k = trackKey(t);
          const filtered = s.history.filter((h) => h.key !== k);
          return {
            history: [{ key: k, at: Date.now() }, ...filtered].slice(0, 200),
            tracksById: { ...s.tracksById, [k]: t },
          };
        }),

      pushSearch: (q) =>
        set((s) => {
          const t = q.trim();
          if (!t) return s;
          const filtered = s.searchHistory.filter((x) => x.toLowerCase() !== t.toLowerCase());
          return { searchHistory: [t, ...filtered].slice(0, 30) };
        }),
      clearSearchHistory: () => set({ searchHistory: [] }),

      createPlaylist: (name) => {
        const p: Playlist = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackKeys: [],
        };
        set((s) => ({ playlists: [p, ...s.playlists] }));
        return p;
      },
      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
          ),
        })),
      deletePlaylist: (id) =>
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
      addToPlaylist: (id, t) =>
        set((s) => {
          const k = trackKey(t);
          return {
            playlists: s.playlists.map((p) =>
              p.id === id && !p.trackKeys.includes(k)
                ? { ...p, trackKeys: [...p.trackKeys, k], updatedAt: Date.now(), cover: p.cover }
                : p,
            ),
            tracksById: { ...s.tracksById, [k]: t },
          };
        }),
      removeFromPlaylist: (id, key) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? { ...p, trackKeys: p.trackKeys.filter((k) => k !== key), updatedAt: Date.now() }
              : p,
          ),
        })),
      reorderPlaylist: (id, from, to) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== id) return p;
            const arr = [...p.trackKeys];
            const [it] = arr.splice(from, 1);
            arr.splice(to, 0, it);
            return { ...p, trackKeys: arr, updatedAt: Date.now() };
          }),
        })),

      addDownload: (d) => set((s) => ({ downloads: [d, ...s.downloads.filter((x) => x.id !== d.id)] })),
      updateDownload: (id, patch) =>
        set((s) => ({
          downloads: s.downloads.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDownload: (id) => set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),
    }),
    {
      name: "muis-library",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : undefined as unknown as Storage)),
      partialize: (s) => ({
        library: s.library,
        favorites: s.favorites,
        favoriteArtists: s.favoriteArtists,
        history: s.history,
        searchHistory: s.searchHistory,
        playlists: s.playlists,
        tracksById: s.tracksById,
        // downloads intentionally omitted (blobs)
      }),
    },
  ),
);

// unused import guard
void ensureTrack;
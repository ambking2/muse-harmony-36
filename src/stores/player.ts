import { create } from "zustand";
import type { Quality, Track } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  originalQueue: Track[]; // for un-shuffle
  index: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isExpanded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  quality: Quality;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
  sleepAt: number | null; // ms epoch
  accent: string | null; // css color derived from the current artwork

  playTrack: (t: Track, list?: Track[]) => void;
  playQueue: (list: Track[], startIndex?: number) => void;
  addToQueue: (t: Track) => void;
  addTracks: (list: Track[]) => void;
  playNext: (t: Track) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  next: () => void;
  prev: () => void;
  setPlaying: (p: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  togglePlay: () => void;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setQuality: (q: Quality) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (r: number) => void;
  setSleepMinutes: (m: number | null) => void;
  setAccent: (a: string | null) => void;
  _seekRequest: number; // signal for audio hook
}

function shuffleArr<T>(arr: T[], keepIndex: number) {
  if (arr.length === 0) return arr;
  // Clamped rather than trusted: an index past the end used to pull
  // `undefined` out of the array and splice it into the front of the queue.
  const i = Math.max(0, Math.min(keepIndex, arr.length - 1));
  const keep = arr[i];
  const rest = arr.filter((_, k) => k !== i);
  for (let j = rest.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [rest[j], rest[k]] = [rest[k], rest[j]];
  }
  return [keep, ...rest];
}

/** Tracks are identified by provider + id; position is not identity. */
function sameTrack(a?: Track, b?: Track): boolean {
  return !!a && !!b && a.id === b.id && a.source === b.source;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  index: 0,
  isPlaying: false,
  isBuffering: false,
  isExpanded: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  quality: 320,
  shuffle: false,
  repeat: "off",
  playbackRate: 1,
  sleepAt: null,
  accent: null,
  _seekRequest: 0,

  playTrack: (t, list) => {
    const arr = list && list.length ? list : [t];
    const found = arr.findIndex((x) => x.id === t.id && x.source === t.source);
    set({
      queue: arr,
      originalQueue: arr,
      index: found === -1 ? 0 : found,
      // A fresh queue is in its given order. Leaving `shuffle` set here is what
      // made the playlist page's shuffle button play in order the second time
      // it was pressed: the next toggle turned shuffling *off*.
      shuffle: false,
      isPlaying: true,
      isBuffering: true,
      currentTime: 0,
      duration: 0,
    });
  },
  playQueue: (list, startIndex = 0) =>
    set({
      queue: list,
      originalQueue: list,
      index: Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1)),
      shuffle: false,
      isPlaying: true,
      isBuffering: true,
      currentTime: 0,
      duration: 0,
    }),
  addToQueue: (t) =>
    set((s) => ({ queue: [...s.queue, t], originalQueue: [...s.originalQueue, t] })),
  addTracks: (list) =>
    set((s) => ({
      queue: [...s.queue, ...list],
      originalQueue: [...s.originalQueue, ...list],
    })),
  playNext: (t) =>
    set((s) => {
      const q = [...s.queue];
      q.splice(s.index + 1, 0, t);
      // Mirror the insert into the stored order, right after the current
      // track. Without this the track vanished the moment shuffle was turned
      // off, because the original order never learned it existed.
      const o = [...s.originalQueue];
      const current = s.queue[s.index];
      const at = o.findIndex((x) => sameTrack(x, current));
      o.splice(at === -1 ? o.length : at + 1, 0, t);
      return { queue: q, originalQueue: o };
    }),
  removeFromQueue: (index) =>
    set((s) => {
      const target = s.queue[index];
      const q = s.queue.filter((_, i) => i !== index);
      // Filtered by identity, not by position. While shuffled, index `index`
      // points at a different track in the stored order, and removing that one
      // instead would resurrect a track the user just deleted.
      const o = target ? s.originalQueue.filter((x) => !sameTrack(x, target)) : s.originalQueue;
      let idx = s.index;
      if (index < s.index) idx -= 1;
      if (index === s.index) idx = Math.min(idx, q.length - 1);
      return {
        queue: q,
        originalQueue: o,
        index: Math.max(0, idx),
        isPlaying: q.length === 0 ? false : s.isPlaying,
      };
    }),
  // Move a queue item to an absolute position — used by queue drag & drop.
  moveInQueue: (from, to) =>
    set((s) => {
      if (from === to) return s;
      const clamp = (n: number) => Math.max(0, Math.min(n, s.queue.length));
      const q = [...s.queue];
      const [item] = q.splice(from, 1);
      if (!item) return s;
      q.splice(clamp(to), 0, item);
      const current = s.queue[s.index];
      const index = q.findIndex((t) => sameTrack(t, current));

      // While shuffled, what the user is dragging is the *shuffled* order, and
      // there is no meaningful equivalent position in the stored one. Leaving
      // it alone is the honest answer: turning shuffle off restores the order
      // the playlist was actually in.
      if (s.shuffle) return { queue: q, index: index === -1 ? s.index : index };

      const o = [...s.originalQueue];
      const [stored] = o.splice(from, 1);
      if (stored) o.splice(clamp(to), 0, stored);
      return { queue: q, originalQueue: o, index: index === -1 ? s.index : index };
    }),
  clearQueue: () =>
    set({
      queue: [],
      originalQueue: [],
      index: 0,
      // Same reasoning as playQueue: with no queue there is no order to be
      // shuffled, and leaving the flag set made the next one appear broken.
      shuffle: false,
      isPlaying: false,
      isBuffering: false,
    }),

  next: () => {
    const { queue, index, repeat } = get();
    if (!queue.length) return;
    if (repeat === "one") {
      set({ currentTime: 0, _seekRequest: get()._seekRequest + 1, isPlaying: true });
      return;
    }
    if (index + 1 >= queue.length) {
      if (repeat === "all") set({ index: 0, currentTime: 0, duration: 0, isPlaying: true });
      else set({ isPlaying: false, isBuffering: false });
      return;
    }
    set({ index: index + 1, currentTime: 0, duration: 0, isPlaying: true, isBuffering: true });
  },
  prev: () => {
    const { index, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0, _seekRequest: get()._seekRequest + 1 });
      return;
    }
    if (index === 0) {
      set({ currentTime: 0, _seekRequest: get()._seekRequest + 1 });
      return;
    }
    set({ index: index - 1, currentTime: 0, duration: 0, isPlaying: true, isBuffering: true });
  },
  setPlaying: (p) => set({ isPlaying: p }),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  seek: (t) => set((s) => ({ currentTime: t, _seekRequest: s._seekRequest + 1 })),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: v === 0 }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setQuality: (q) => set({ quality: q }),
  toggleShuffle: () =>
    set((s) => {
      if (s.shuffle) {
        // Restore the stored order, keeping the same track playing.
        const current = s.queue[s.index];
        const idx = s.originalQueue.findIndex((t) => sameTrack(t, current));
        return { shuffle: false, queue: s.originalQueue, index: Math.max(0, idx) };
      }
      if (s.queue.length === 0) return s;
      const shuffled = shuffleArr(s.queue, s.index);
      return { shuffle: true, queue: shuffled, index: 0 };
    }),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  setPlaybackRate: (r) => set({ playbackRate: r }),
  setSleepMinutes: (m) => set({ sleepAt: m === null ? null : Date.now() + m * 60_000 }),
  setAccent: (a) => set({ accent: a }),
}));

export function currentTrack(state: PlayerState) {
  return state.queue[state.index];
}

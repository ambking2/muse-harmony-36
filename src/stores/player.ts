import { create } from "zustand";
import type { Quality, Track } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  originalQueue: Track[];
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  quality: Quality;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
  sleepAt: number | null;
  accent: string | null;
  error: string | null;
  isBuffering: boolean;
  playTrack: (t: Track, list?: Track[]) => void;
  playQueue: (list: Track[], startIndex?: number) => void;
  selectQueueIndex: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  addToQueue: (t: Track) => void;
  playNext: (t: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  next: () => void;
  prev: () => void;
  setPlaying: (p: boolean) => void;
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
  _seekRequest: number;
}

const validIndex = (index: number, length: number) =>
  Number.isInteger(index) && index >= 0 && index < length;
const sameTrack = (a: Track, b: Track) => a.id === b.id && a.source === b.source;
// Each queue entry owns a distinct object, including repeated songs. This keeps
// occurrence identity stable while shuffling, removing and reordering entries.
const copyEntries = (list: Track[]) => list.map((track) => ({ ...track }));
function shuffleArr(arr: Track[], keepIndex: number) {
  if (!arr.length) return [];
  const rest = arr.filter((_, i) => i !== keepIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [arr[keepIndex], ...rest];
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  index: 0,
  isPlaying: false,
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
  error: null,
  isBuffering: false,
  _seekRequest: 0,

  playTrack: (t, list) => {
    const index = list?.findIndex((entry) => sameTrack(entry, t)) ?? -1;
    get().playQueue(index >= 0 && list ? list : [t], Math.max(0, index));
  },
  playQueue: (list, startIndex = 0) => {
    const originalQueue = copyEntries(list);
    const index = Number.isFinite(startIndex)
      ? Math.min(Math.max(0, Math.trunc(startIndex)), Math.max(0, list.length - 1))
      : 0;
    const queue = get().shuffle ? shuffleArr(originalQueue, index) : originalQueue;
    set((s) => ({
      queue,
      originalQueue,
      index: s.shuffle ? 0 : index,
      isPlaying: queue.length > 0,
      currentTime: 0,
      duration: 0,
      error: null,
      _seekRequest: s._seekRequest + 1,
    }));
  },
  selectQueueIndex: (index) => {
    if (!validIndex(index, get().queue.length)) return;
    set((s) => ({
      index,
      currentTime: 0,
      duration: index === s.index ? s.duration : 0,
      isPlaying: true,
      error: null,
      _seekRequest: s._seekRequest + 1,
    }));
  },
  moveInQueue: (from, to) => {
    const s = get();
    if (!validIndex(from, s.queue.length) || !validIndex(to, s.queue.length) || from === to) return;
    const queue = [...s.queue];
    const current = queue[s.index];
    const [entry] = queue.splice(from, 1);
    queue.splice(to, 0, entry);
    set({ queue, index: queue.indexOf(current), originalQueue: s.shuffle ? s.originalQueue : [...queue] });
  },
  addToQueue: (t) => {
    const entry = { ...t };
    set((s) => ({ queue: [...s.queue, entry], originalQueue: [...s.originalQueue, entry] }));
  },
  playNext: (t) => {
    const entry = { ...t };
    set((s) => {
      const queue = [...s.queue];
      const originalQueue = [...s.originalQueue];
      const originalIndex = originalQueue.indexOf(s.queue[s.index]);
      queue.splice(s.queue.length ? s.index + 1 : 0, 0, entry);
      originalQueue.splice(originalIndex + 1, 0, entry);
      return { queue, originalQueue };
    });
  },
  removeFromQueue: (index) => {
    const s = get();
    if (!validIndex(index, s.queue.length)) return;
    const entry = s.queue[index];
    const queue = s.queue.filter((_, i) => i !== index);
    const originalQueue = s.originalQueue.filter((track) => track !== entry);
    const nextIndex = Math.max(0, Math.min(s.index - (index < s.index ? 1 : 0), queue.length - 1));
    set({
      queue,
      originalQueue,
      index: nextIndex,
      ...(index === s.index ? { currentTime: 0, duration: 0, error: null, _seekRequest: s._seekRequest + 1 } : {}),
      ...(!queue.length ? { isPlaying: false, isBuffering: false } : {}),
    });
  },
  clearQueue: () => set({ queue: [], originalQueue: [], index: 0, isPlaying: false, currentTime: 0, duration: 0, error: null, isBuffering: false }),
  next: () => {
    const s = get();
    if (!s.queue.length) return;
    if (s.repeat === "one") {
      s.selectQueueIndex(s.index);
    } else if (s.index + 1 < s.queue.length) {
      s.selectQueueIndex(s.index + 1);
    } else if (s.repeat === "all") {
      s.selectQueueIndex(0);
    } else {
      set({ isPlaying: false });
    }
  },
  prev: () => {
    const s = get();
    if (!s.queue.length) return;
    if (s.currentTime > 3 || s.index === 0) s.seek(0);
    else s.selectQueueIndex(s.index - 1);
  },
  setPlaying: (p) => set((s) => ({ isPlaying: p && s.queue.length > 0 })),
  togglePlay: () => set((s) => ({ isPlaying: s.queue.length > 0 && !s.isPlaying, error: null })),
  setTime: (t) => { if (Number.isFinite(t)) set({ currentTime: Math.max(0, t) }); },
  setDuration: (d) => set({ duration: Number.isFinite(d) ? Math.max(0, d) : 0 }),
  seek: (t) => {
    if (!Number.isFinite(t)) return;
    set((s) => ({ currentTime: Math.max(0, Math.min(t, s.duration || Math.max(0, t))), _seekRequest: s._seekRequest + 1 }));
  },
  setVolume: (v) => {
    if (!Number.isFinite(v)) return;
    const volume = Math.max(0, Math.min(1, v));
    set({ volume, muted: volume === 0 });
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setQuality: (q) => set({ quality: q }),
  toggleShuffle: () => set((s) => {
    if (!s.queue.length) return { shuffle: !s.shuffle };
    if (s.shuffle) {
      return { shuffle: false, queue: [...s.originalQueue], index: Math.max(0, s.originalQueue.indexOf(s.queue[s.index])) };
    }
    return { shuffle: true, originalQueue: [...s.queue], queue: shuffleArr(s.queue, s.index), index: 0 };
  }),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
  setPlaybackRate: (r) => { if (Number.isFinite(r)) set({ playbackRate: Math.max(0.25, Math.min(4, r)) }); },
  setSleepMinutes: (m) => {
    if (m !== null && (!Number.isFinite(m) || m <= 0 || m > 1440)) return;
    set({ sleepAt: m === null ? null : Date.now() + m * 60_000 });
  },
  setAccent: (a) => set({ accent: a }),
}));

export function currentTrack(state: PlayerState) {
  return state.queue[state.index];
}

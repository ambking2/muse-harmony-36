import { create } from "zustand";
import type { Quality, Track } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  originalQueue: Track[]; // for un-shuffle
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
  sleepAt: number | null; // ms epoch
  accent: string | null; // hex or oklch

  playTrack: (t: Track, list?: Track[]) => void;
  playQueue: (list: Track[], startIndex?: number) => void;
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
  _seekRequest: number; // signal for audio hook
}

function shuffleArr<T>(arr: T[], keepIndex: number) {
  const keep = arr[keepIndex];
  const rest = arr.filter((_, i) => i !== keepIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [keep, ...rest];
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
  _seekRequest: 0,

  playTrack: (t, list) => {
    const arr = list && list.length ? list : [t];
    const idx = Math.max(0, arr.findIndex((x) => x.id === t.id && x.source === t.source));
    set({
      queue: arr,
      originalQueue: arr,
      index: idx === -1 ? 0 : idx,
      isPlaying: true,
      currentTime: 0,
    });
  },
  playQueue: (list, startIndex = 0) =>
    set({
      queue: list,
      originalQueue: list,
      index: Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1)),
      isPlaying: true,
      currentTime: 0,
    }),
  addToQueue: (t) =>
    set((s) => ({ queue: [...s.queue, t], originalQueue: [...s.originalQueue, t] })),
  playNext: (t) =>
    set((s) => {
      const q = [...s.queue];
      q.splice(s.index + 1, 0, t);
      return { queue: q };
    }),
  removeFromQueue: (index) =>
    set((s) => {
      const q = s.queue.filter((_, i) => i !== index);
      let idx = s.index;
      if (index < s.index) idx -= 1;
      if (index === s.index) idx = Math.min(idx, q.length - 1);
      return { queue: q, index: Math.max(0, idx) };
    }),
  clearQueue: () => set({ queue: [], originalQueue: [], index: 0, isPlaying: false }),

  next: () => {
    const { queue, index, repeat } = get();
    if (!queue.length) return;
    if (repeat === "one") {
      set({ currentTime: 0, _seekRequest: get()._seekRequest + 1, isPlaying: true });
      return;
    }
    if (index + 1 >= queue.length) {
      if (repeat === "all") set({ index: 0, currentTime: 0, isPlaying: true });
      else set({ isPlaying: false });
      return;
    }
    set({ index: index + 1, currentTime: 0, isPlaying: true });
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
    set({ index: index - 1, currentTime: 0, isPlaying: true });
  },
  setPlaying: (p) => set({ isPlaying: p }),
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
        // restore
        const curTrack = s.queue[s.index];
        const idx = s.originalQueue.findIndex(
          (t) => t.id === curTrack?.id && t.source === curTrack?.source,
        );
        return { shuffle: false, queue: s.originalQueue, index: Math.max(0, idx) };
      }
      const shuffled = shuffleArr(s.queue, s.index);
      return { shuffle: true, queue: shuffled, index: 0 };
    }),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  setPlaybackRate: (r) => set({ playbackRate: r }),
  setSleepMinutes: (m) =>
    set({ sleepAt: m === null ? null : Date.now() + m * 60_000 }),
  setAccent: (a) => set({ accent: a }),
}));

export function currentTrack(state: PlayerState) {
  return state.queue[state.index];
}
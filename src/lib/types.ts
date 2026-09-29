/**
 * `kuwo` is kept in the type because tracks already saved on a user's device
 * carry it, and the store has to be able to read them back. It is no longer
 * queried — see SOURCES in lib/gdmusic.
 */
export type MusicSource = "netease" | "kuwo" | "joox";
export type Quality = 128 | 320 | 999;

export interface Track {
  id: string;
  name: string;
  artist: string[];
  album: string;
  pic_id: string;
  url_id: string;
  lyric_id: string;
  source: MusicSource;
  /** Local object URL for an offline copy. When set, playback skips the network. */
  srcUrl?: string;
  /** Cached artwork URL, so offline tracks still render their cover. */
  picUrl?: string;
}

export interface StreamUrl {
  url: string;
  br: number;
  size: number;
}

export interface LyricLine {
  time: number;
  text: string;
  /** Second line shown under `text` — a translation or romanisation. */
  text2?: string;
}

export interface DownloadItem {
  id: string; // `${source}:${id}:${br}`
  track: Track;
  br: number;
  size: number;
  progress: number; // 0..1
  status: "queued" | "downloading" | "paused" | "done" | "error";
  /**
   * Object URL for the downloaded bytes. Lives in memory only — it is rebuilt
   * on load from IndexedDB by `hydrateDownloads`, so it is never persisted.
   */
  blobUrl?: string;
  createdAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cover?: string;
  trackKeys: string[]; // trackKey = `${source}:${id}`
}

export function trackKey(t: Pick<Track, "source" | "id">) {
  return `${t.source}:${t.id}`;
}

export function keyToParts(k: string): { source: MusicSource; id: string } {
  const [source, ...rest] = k.split(":");
  return { source: source as MusicSource, id: rest.join(":") };
}

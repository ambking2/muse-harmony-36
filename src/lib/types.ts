export type MusicSource = "netease" | "kuwo" | "joox";
export type Quality = 128 | 192 | 320 | 740 | 999;

export interface Track {
  id: string;
  name: string;
  artist: string[];
  album: string;
  pic_id: string;
  url_id: string;
  lyric_id: string;
  source: MusicSource;
}

export interface StreamUrl {
  url: string;
  br: number;
  size: number;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface DownloadItem {
  id: string; // `${source}:${id}:${br}`
  track: Track;
  br: number;
  size: number;
  progress: number; // 0..1
  status: "queued" | "downloading" | "paused" | "done" | "error";
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

export function trackKey(t: Track) {
  return `${t.source}:${t.id}`;
}

export function keyToParts(k: string): { source: MusicSource; id: string } {
  const [source, ...rest] = k.split(":");
  return { source: source as MusicSource, id: rest.join(":") };
}
import type { LyricLine, MusicSource, Quality, StreamUrl, Track } from "./types";

const BASE = "/api/gd/proxy"; // splat proxy — path segment is ignored

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  return s.toString();
}

async function api<T>(params: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(`${BASE}?${qs(params)}`);
  if (!res.ok) throw new Error(`gdmusic ${res.status}`);
  return res.json();
}

export const SOURCES: { id: MusicSource; label: string }[] = [
  { id: "netease", label: "NetEase" },
  { id: "kuwo", label: "Kuwo" },
  { id: "joox", label: "JOOX" },
];

export const QUALITIES: { br: Quality; label: string }[] = [
  { br: 128, label: "128 kbps" },
  { br: 320, label: "320 kbps" },
  { br: 999, label: "FLAC" },
];

export async function searchTracks(
  name: string,
  { source = "netease" as MusicSource, count = 30, page = 1 } = {},
): Promise<Track[]> {
  if (!name.trim()) return [];
  const data = await api<Track[] | { error: string }>({
    types: "search",
    source,
    name,
    count,
    pages: page,
  });
  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * Search across every available provider in parallel and merge into a single,
 * de-duplicated, interleaved list. Consumers should never need to know which
 * upstream a track came from.
 */
export async function searchTracksAll(
  name: string,
  { count = 20, page = 1 }: { count?: number; page?: number } = {},
): Promise<Track[]> {
  if (!name.trim()) return [];
  const per = Math.max(6, Math.ceil(count / SOURCES.length) + 2);
  const results = await Promise.all(
    SOURCES.map((s) =>
      searchTracks(name, { source: s.id, count: per, page }).catch(() => [] as Track[]),
    ),
  );
  // Interleave provider results so the first page mixes sources fairly.
  const merged: Track[] = [];
  const max = Math.max(...results.map((r) => r.length));
  for (let i = 0; i < max; i++) {
    for (const r of results) if (r[i]) merged.push(r[i]);
  }
  // Dedupe by name+primary artist (case/space insensitive) — favours the first hit.
  const seen = new Set<string>();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const out: Track[] = [];
  for (const t of merged) {
    const key = `${norm(t.name)}|${norm(t.artist[0] ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function getStreamUrl(
  source: MusicSource,
  id: string,
  br: Quality = 320,
): Promise<StreamUrl> {
  return api<StreamUrl>({ types: "url", source, id, br });
}

export async function getPicUrl(
  source: MusicSource,
  picId: string,
  size = 500,
): Promise<string> {
  try {
    const data = await api<{ url?: string }>({ types: "pic", source, id: picId, size });
    return data.url || "";
  } catch {
    return "";
  }
}

export async function getLyric(
  source: MusicSource,
  lyricId: string,
): Promise<{ raw: string; lines: LyricLine[]; tRaw?: string }> {
  try {
    const data = await api<{ lyric?: string; tlyric?: string }>({
      types: "lyric",
      source,
      id: lyricId,
    });
    return { raw: data.lyric ?? "", lines: parseLrc(data.lyric ?? ""), tRaw: data.tlyric };
  } catch {
    return { raw: "", lines: [] };
  }
}

export function parseLrc(raw: string): LyricLine[] {
  if (!raw) return [];
  const out: LyricLine[] = [];
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const line of raw.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    const times: number[] = [];
    let lastEnd = 0;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      const mm = Number(m[1]);
      const ss = Number(m[2]);
      const ms = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
      times.push(mm * 60 + ss + ms / 1000);
      lastEnd = m.index + m[0].length;
    }
    const text = line.slice(lastEnd).trim();
    if (!times.length) continue;
    if (!text) continue;
    for (const t of times) out.push({ time: t, text });
  }
  return out.sort((a, b) => a.time - b.time);
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
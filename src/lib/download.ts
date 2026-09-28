import { toast } from "sonner";
import { getStreamUrl } from "./gdmusic";
import type { DownloadItem, Quality, Track } from "./types";
import { useLibrary } from "@/stores/library";
import { saveAudioBlob } from "./offline";

const inflight = new Map<string, AbortController>();

export async function downloadTrack(track: Track, br: Quality = 320) {
  const id = `${track.source}:${track.id}:${br}`;
  if (inflight.has(id)) {
    toast.message("Already downloading");
    return;
  }
  const controller = new AbortController();
  inflight.set(id, controller);

  const { addDownload, updateDownload } = useLibrary.getState();
  addDownload({
    id,
    track,
    br,
    size: 0,
    progress: 0,
    status: "downloading",
    createdAt: Date.now(),
  });

  try {
    const stream = await getStreamUrl(track.source, track.id, br);
    if (!stream.url) throw new Error("No stream");
    updateDownload(id, { size: stream.size });

    const res = await fetch(stream.url, { signal: controller.signal });
    if (!res.ok || !res.body) throw new Error("Download failed");

    const total = Number(res.headers.get("content-length") || stream.size || 0);
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(new Uint8Array(value));
        received += value.byteLength;
        if (total > 0) updateDownload(id, { progress: received / total });
      }
    }
    const type = br === 999 ? "audio/flac" : "audio/mpeg";
    const blob = new Blob(chunks, { type });

    // Persist the bytes first — if this fails the download is not really done.
    const saved = await saveAudioBlob(id, blob);
    if (!saved) throw new Error("Could not store file offline");

    const blobUrl = URL.createObjectURL(blob);
    const previous = useLibrary.getState().downloads.find((d) => d.id === id);
    if (previous?.blobUrl) URL.revokeObjectURL(previous.blobUrl);
    updateDownload(id, { blobUrl, progress: 1, status: "done", size: blob.size });

    // Hand the file to the browser as a convenience.
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${track.artist.join(", ")} - ${track.name}.${br === 999 ? "flac" : "mp3"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download complete", {
      description: "Saved for offline listening",
      action: { label: "View", onClick: () => (window.location.hash = "#/downloads") },
    });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    updateDownload(id, { status: aborted ? "paused" : "error", progress: 0 });
    if (!aborted)
      toast.error("Download failed", {
        description: "This track may not be available at that quality.",
      });
  } finally {
    inflight.delete(id);
  }
}

/** Abort an in-flight download; the partial state is kept as "paused". */
export function cancelDownload(id: string) {
  inflight.get(id)?.abort();
}

export function isDownloading(id: string) {
  return inflight.has(id);
}

/** Re-trigger a paused/failed download with the same settings. */
export function retryDownload(item: DownloadItem) {
  return downloadTrack(item.track, item.br as Quality);
}

/** Play a finished download from its local bytes instead of the network. */
export function playDownload(item: DownloadItem) {
  if (item.status !== "done" || !item.blobUrl) {
    toast.error("File not available offline");
    return;
  }
  // `srcUrl` is picked up by the audio engine ahead of any network stream.
  const track: Track = { ...item.track, srcUrl: item.blobUrl };
  useLibrary.getState().addToLibrary(track);
  return track;
}

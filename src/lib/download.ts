import { toast } from "sonner";
import { getStreamUrl } from "./gdmusic";
import type { Quality, Track } from "./types";
import { useLibrary } from "@/stores/library";

export async function downloadTrack(track: Track, br: Quality = 320) {
  const id = `${track.source}:${track.id}:${br}`;
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

    const res = await fetch(stream.url);
    if (!res.ok || !res.body) throw new Error("Download failed");

    const total = Number(res.headers.get("content-length") || stream.size || 0);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (total > 0) updateDownload(id, { progress: received / total });
      }
    }
    const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
    const blobUrl = URL.createObjectURL(blob);
    updateDownload(id, { blobUrl, progress: 1, status: "done", size: blob.size });

    // trigger save
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${track.artist.join(", ")} - ${track.name}.${br === 999 ? "flac" : "mp3"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download complete");
  } catch (e) {
    updateDownload(id, { status: "error" });
    toast.error("Download failed");
  }
}
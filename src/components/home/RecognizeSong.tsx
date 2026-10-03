import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

import { TrackRow } from "@/components/music/TrackRow";
import { searchSmart, isSameSong } from "@/lib/gdmusic";
import type { Track } from "@/lib/types";

type Recognition = {
  title: string;
  artist: string;
  track?: Track;
};

export function RecognizeSong() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Recognition | null>(null);
  const [error, setError] = useState("");

  async function start() {
    if (recording || busy) return;
    setError("");
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("مرورگر شما از تشخیص آهنگ پشتیبانی نمی‌کند.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await recognize(blob);
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 7000);
    } catch {
      setError("دسترسی به میکروفون داده نشد.");
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      setBusy(true);
    }
  }

  async function recognize(blob: Blob) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "recognition.webm");

      const response = await fetch("/api/shazam", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        matched?: boolean;
        title?: string;
        artist?: string;
      };

      if (!response.ok || !data.matched || !data.title) {
        setError("نتونستم آهنگ رو تشخیص بدم.");
        return;
      }

      const title = data.title.trim();
      const artist = (data.artist || "").trim();
      const candidates = await searchSmart(
        [title, artist].filter(Boolean).join(" "),
        { count: 12, iranianFirst: false },
      );
      const track = candidates.find((candidate) =>
        isSameSong(
          { name: title, artist: artist ? [artist] : [] },
          candidate,
        ),
      );

      setResult({ title, artist, track });
    } catch {
      setError("تشخیص آهنگ انجام نشد. دوباره امتحان کنید.");
    } finally {
      setBusy(false);
      setRecording(false);
      recorderRef.current = null;
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ios-fill px-4 text-ios-label disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : recording ? (
          <Square className="size-4 fill-current" />
        ) : (
          <Mic className="size-4" />
        )}
        <span>
          {busy ? "در حال تشخیص..." : recording ? "توقف و تشخیص" : "تشخیص آهنگ"}
        </span>
      </button>

      {result && (
        <div className="mt-3 rounded-2xl border border-ios-separator bg-ios-surface/70 p-3 backdrop-blur-xl">
          <p className="type-footnote text-ios-label-secondary">تشخیص داده شد</p>
          <p className="type-headline mt-1">{result.title}</p>
          {result.artist && (
            <p className="type-subheadline mt-0.5 text-ios-label-secondary">
              {result.artist}
            </p>
          )}

          {result.track ? (
            <div className="mt-3 overflow-hidden rounded-xl">
              <TrackRow track={result.track} list={[result.track]} index={0} />
            </div>
          ) : (
            <p className="type-footnote mt-3 text-ios-label-secondary">
              متأسفانه این آهنگ در Muse Harmony موجود نیست.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="type-footnote mt-2 text-ios-label-secondary">{error}</p>
      )}
    </div>
  );
}

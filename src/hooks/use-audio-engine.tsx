import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl, getStreamUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { getAudioEl } from "@/lib/audio-el";

/** Mount once at app root. Owns the single <audio> element. */
export function AudioEngine() {
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const quality = usePlayer((s) => s.quality);
  const rate = usePlayer((s) => s.playbackRate);
  const seekReq = usePlayer((s) => s._seekRequest);
  const seekTarget = usePlayer((s) => s.currentTime);
  const sleepAt = usePlayer((s) => s.sleepAt);

  const pushHistory = useLibrary((s) => s.pushHistory);

  const trackId = track ? trackKey(track) : null;

  const streamQ = useQuery({
    queryKey: ["stream", trackId, quality],
    enabled: !!track,
    staleTime: 5 * 60_000,
    queryFn: () => getStreamUrl(track!.source, track!.id, quality),
  });

  const picQ = useQuery({
    queryKey: ["pic", trackId, "500"],
    enabled: !!track,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 500),
  });

  // Attach listeners to the singleton audio element
  useEffect(() => {
    const a = getAudioEl();
    if (!a) return;
    const onTime = () => usePlayer.setState({ currentTime: a.currentTime });
    const onDur = () => usePlayer.setState({ duration: a.duration || 0 });
    const onEnd = () => usePlayer.getState().next();
    const onPlay = () => usePlayer.setState({ isPlaying: true });
    const onPause = () => usePlayer.setState({ isPlaying: false });
    const onError = () => {
      console.warn("[audio] load/play error", a.error);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
    };
  }, []);

  // Load source when stream changes
  useEffect(() => {
    const a = getAudioEl();
    if (!a) return;
    const url = streamQ.data?.url;
    if (!url) return;
    if (a.src !== url) {
      a.src = url;
      a.load();
      a.play().catch((err) => console.warn("[audio] play blocked", err));
    }
    if (track) pushHistory(track);
  }, [streamQ.data?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play/pause
  useEffect(() => {
    const a = getAudioEl();
    if (!a) return;
    if (isPlaying) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying]);

  useEffect(() => {
    const a = getAudioEl();
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const a = getAudioEl();
    if (a) a.playbackRate = rate;
  }, [rate]);

  // External seek
  useEffect(() => {
    const a = getAudioEl();
    if (!a) return;
    if (Math.abs(a.currentTime - seekTarget) > 0.5) a.currentTime = seekTarget;
  }, [seekReq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sleep timer
  useEffect(() => {
    if (!sleepAt) return;
    const remaining = sleepAt - Date.now();
    if (remaining <= 0) {
      usePlayer.setState({ isPlaying: false, sleepAt: null });
      return;
    }
    const t = setTimeout(() => {
      usePlayer.setState({ isPlaying: false, sleepAt: null });
    }, remaining);
    return () => clearTimeout(t);
  }, [sleepAt]);

  // Media Session
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist.join(", "),
      album: track.album,
      artwork: picQ.data
        ? [
            { src: picQ.data, sizes: "500x500", type: "image/jpeg" },
          ]
        : [],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => usePlayer.setState({ isPlaying: true }));
    ms.setActionHandler("pause", () => usePlayer.setState({ isPlaying: false }));
    ms.setActionHandler("previoustrack", () => usePlayer.getState().prev());
    ms.setActionHandler("nexttrack", () => usePlayer.getState().next());
    ms.setActionHandler("seekto", (e) => {
      if (typeof e.seekTime === "number") usePlayer.getState().seek(e.seekTime);
    });
  }, [track?.id, picQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
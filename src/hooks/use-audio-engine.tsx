import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl, getStreamUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { toast } from "sonner";

/** Mount once at app root. Owns the single <audio> element. */
export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  const isOffline = !!track?.srcUrl;

  const streamQ = useQuery({
    queryKey: ["stream", trackId, quality],
    enabled: !!track && !isOffline,
    staleTime: 5 * 60_000,
    retry: 2,
    queryFn: () => getStreamUrl(track!.source, track!.id, quality),
  });

  const picQ = useQuery({
    queryKey: ["pic", trackId, "500"],
    enabled: !!track && !track!.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 500),
  });

  // Create audio element once
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    audioRef.current = a;
    const onTime = () => usePlayer.setState({ currentTime: a.currentTime });
    const onDur = () => usePlayer.setState({ duration: a.duration || 0 });
    const onEnd = () => usePlayer.getState().next();
    const onPlay = () => usePlayer.setState({ isPlaying: true });
    const onPause = () => usePlayer.setState({ isPlaying: false });
    const onError = () => {
      usePlayer.setState({ isPlaying: false });
      const t = usePlayer.getState().queue[usePlayer.getState().index];
      if (t) toast.error("This track could not be played", { description: t.name });
    };
    const onWaiting = () => usePlayer.setState({ isBuffering: true });
    const onPlaying = () => usePlayer.setState({ isBuffering: false });
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("canplay", onPlaying);
    return () => {
      a.pause();
      a.src = "";
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("canplay", onPlaying);
    };
  }, []);

  // Load source when stream changes. An offline track carries its own srcUrl.
  const resolvedUrl = track?.srcUrl ?? streamQ.data?.url ?? null;
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!resolvedUrl) {
      if (streamQ.isError && !isOffline) {
        usePlayer.setState({ isPlaying: false });
        toast.error("Could not load this track", { description: "Try another quality or source." });
      }
      return;
    }
    if (a.src !== resolvedUrl) {
      a.src = resolvedUrl;
      a.load();
      if (isPlaying) a.play().catch(() => {});
    }
    if (track) pushHistory(track);
  }, [resolvedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = rate;
  }, [rate]);

  // External seek
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (Math.abs(a.currentTime - seekTarget) > 0.5) a.currentTime = seekTarget;
  }, [seekReq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sleep timer — re-armed every 30s so a throttled tab still stops in time.
  useEffect(() => {
    if (!sleepAt) return;
    const stop = () => usePlayer.setState({ isPlaying: false, sleepAt: null });
    const check = () => {
      if (Date.now() >= sleepAt) stop();
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [sleepAt]);

  // Media Session
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!track) return;
    const art = track.picUrl ?? picQ.data;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist.join(", "),
      album: track.album,
      artwork: art ? [{ src: art, sizes: "500x500", type: "image/jpeg" }] : [],
    });
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler("play", () => usePlayer.setState({ isPlaying: true }));
      ms.setActionHandler("pause", () => usePlayer.setState({ isPlaying: false }));
      ms.setActionHandler("previoustrack", () => usePlayer.getState().prev());
      ms.setActionHandler("nexttrack", () => usePlayer.getState().next());
      ms.setActionHandler("seekto", (e) => {
        if (typeof e.seekTime === "number") usePlayer.getState().seek(e.seekTime);
      });
    } catch {
      // Older browsers reject unknown actions; playback is unaffected.
    }
  }, [track?.id, picQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

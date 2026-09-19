import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl, getStreamUrl } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { useKeyboardShortcuts } from "./use-keyboard";

/** One audio element above the router outlet; navigation never remounts it. */
export function AudioEngine() {
  useKeyboardShortcuts();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedKey = useRef<string | null>(null);
  const generation = useRef(0);
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const quality = usePlayer((s) => s.quality);
  const rate = usePlayer((s) => s.playbackRate);
  const seekReq = usePlayer((s) => s._seekRequest);
  const sleepAt = usePlayer((s) => s.sleepAt);
  const trackId = track ? trackKey(track) : null;
  const sourceKey = trackId ? `${trackId}:${quality}` : null;

  const streamQ = useQuery({
    queryKey: ["stream", trackId, quality],
    enabled: !!track,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: () => getStreamUrl(track!.source, track!.id, quality),
  });
  const picQ = useQuery({
    queryKey: ["pic", track?.source, track?.pic_id, "500"],
    enabled: !!track?.pic_id,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 500),
  });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    // Ordinary media playback does not require anonymous CORS. Requiring it
    // would reject otherwise playable provider URLs without CORS headers.
    audioRef.current = audio;
    const onTime = () => {
      if (loadedKey.current) usePlayer.getState().setTime(audio.currentTime);
    };
    const onDuration = () => usePlayer.getState().setDuration(audio.duration);
    const onMetadata = () => {
      onDuration();
      const target = usePlayer.getState().currentTime;
      if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.min(target, audio.duration);
      audio.playbackRate = usePlayer.getState().playbackRate;
    };
    const onEnd = () => {
      if (loadedKey.current) usePlayer.getState().next();
    };
    const onPlaying = () => {
      if (!loadedKey.current) return;
      usePlayer.setState({ isPlaying: true, isBuffering: false, error: null });
      const state = usePlayer.getState();
      const current = state.queue[state.index];
      if (current) useLibrary.getState().pushHistory(current);
    };
    const onPause = () => {
      if (loadedKey.current && audio.paused && !audio.ended && audio.readyState >= 2) usePlayer.getState().setPlaying(false);
    };
    const onWaiting = () => {
      if (loadedKey.current && usePlayer.getState().isPlaying) usePlayer.setState({ isBuffering: true });
    };
    const onReady = () => usePlayer.setState({ isBuffering: false });
    const onError = () => {
      if (!loadedKey.current || !audio.error) return;
      usePlayer.setState({ isPlaying: false, isBuffering: false, error: "This audio could not be played. Try another quality or track." });
    };
    const listeners: [string, () => void][] = [
      ["timeupdate", onTime], ["durationchange", onDuration], ["loadedmetadata", onMetadata],
      ["ended", onEnd], ["playing", onPlaying], ["pause", onPause],
      ["waiting", onWaiting], ["canplay", onReady], ["error", onError],
    ];
    listeners.forEach(([name, handler]) => audio.addEventListener(name, handler));
    return () => {
      generation.current += 1;
      loadedKey.current = null;
      listeners.forEach(([name, handler]) => audio.removeEventListener(name, handler));
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  // Stop the old source immediately; never keep playing it while a new URL loads.
  // currentTime comes from the store: zero for a new track, preserved for quality changes.
  useEffect(() => {
    generation.current += 1;
    loadedKey.current = null;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    usePlayer.setState({ isBuffering: !!sourceKey, error: null });
  }, [sourceKey]);

  useEffect(() => {
    const audio = audioRef.current;
    const url = streamQ.data?.url;
    if (!audio || !sourceKey || !url) return;
    let parsed: URL;
    try { parsed = new URL(url, window.location.origin); }
    catch { usePlayer.setState({ error: "The provider returned an invalid audio URL.", isPlaying: false, isBuffering: false }); return; }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      usePlayer.setState({ error: "The provider returned an unsupported audio URL.", isPlaying: false, isBuffering: false });
      return;
    }
    loadedKey.current = sourceKey;
    audio.src = parsed.href;
    audio.load();
  }, [sourceKey, streamQ.data?.url]);

  useEffect(() => {
    if (!sourceKey) return;
    if (streamQ.isError || (streamQ.isSuccess && !streamQ.data?.url)) {
      usePlayer.setState({ isPlaying: false, isBuffering: false, error: "No playable audio is available at this quality. Choose another quality or track." });
    }
  }, [sourceKey, streamQ.isError, streamQ.isSuccess, streamQ.data?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isPlaying) { audio.pause(); return; }
    if (!sourceKey || loadedKey.current !== sourceKey) return;
    const token = generation.current;
    const attempt = audio.play();
    void attempt.catch((error: unknown) => {
      if (token !== generation.current || !usePlayer.getState().isPlaying) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      usePlayer.setState({ isPlaying: false, isBuffering: false, error: blocked ? "Your browser paused playback. Tap Play to continue." : "Playback failed. Try another quality or track." });
    });
  }, [isPlaying, sourceKey, streamQ.data?.url, seekReq]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.muted = muted; audio.volume = volume; }
  }, [volume, muted]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !loadedKey.current || audio.readyState < 1) return;
    const target = usePlayer.getState().currentTime;
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.min(target, audio.duration);
  }, [seekReq]);

  useEffect(() => {
    if (!sleepAt) return;
    const expire = () => {
      if (Date.now() >= sleepAt) usePlayer.setState({ isPlaying: false, sleepAt: null });
    };
    const timer = window.setTimeout(expire, Math.max(0, sleepAt - Date.now()));
    document.addEventListener("visibilitychange", expire);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", expire); };
  }, [sleepAt]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const session = navigator.mediaSession;
    session.metadata = track ? new MediaMetadata({ title: track.name, artist: track.artist.join(", "), album: track.album, artwork: picQ.data ? [{ src: picQ.data }] : [] }) : null;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => usePlayer.getState().setPlaying(true)],
      ["pause", () => usePlayer.getState().setPlaying(false)],
      ["previoustrack", () => usePlayer.getState().prev()],
      ["nexttrack", () => usePlayer.getState().next()],
      ["seekto", (event) => { if (typeof event.seekTime === "number") usePlayer.getState().seek(event.seekTime); }],
    ];
    const supported: MediaSessionAction[] = [];
    for (const [action, handler] of handlers) {
      try { session.setActionHandler(action, track ? handler : null); supported.push(action); }
      catch { /* Browsers support different subsets of Media Session actions. */ }
    }
    return () => { for (const action of supported) session.setActionHandler(action, null); };
  }, [track, picQ.data]);
  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = !trackId ? "none" : isPlaying ? "playing" : "paused";
  }, [trackId, isPlaying]);

  return null;
}

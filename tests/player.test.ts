import { beforeEach, describe, expect, test } from "bun:test";
import { usePlayer } from "../src/stores/player";
import type { Track } from "../src/lib/types";

const track = (id: string): Track => ({
  id,
  name: `Track ${id}`,
  artist: ["Test artist"],
  album: "Test album",
  pic_id: id,
  url_id: id,
  lyric_id: id,
  source: "netease",
});
const a = track("a");
const b = track("b");
const c = track("c");
const initial = usePlayer.getInitialState();
const player = () => usePlayer.getState();

beforeEach(() => usePlayer.setState(initial, true));

describe("existing playback contracts", () => {
  test("playTrack selects the requested track in a supplied list", () => {
    player().playTrack(b, [a, b, c]);
    expect(player().index).toBe(1);
    expect(player().isPlaying).toBe(true);
    expect(player().currentTime).toBe(0);
  });
  test("previous restarts the current track after three seconds", () => {
    player().playQueue([a, b], 1);
    player().setTime(8);
    player().prev();
    expect(player().index).toBe(1);
    expect(player().currentTime).toBe(0);
    expect(player()._seekRequest).toBe(1);
  });
  test("repeat cycles off, all, one, off", () => {
    for (const mode of ["all", "one", "off"]) {
      player().cycleRepeat();
      expect(player().repeat).toBe(mode);
    }
  });
  test("the end of a non-repeating queue stops playback", () => {
    player().playQueue([a]);
    player().next();
    expect(player().isPlaying).toBe(false);
  });
  test("repeat-all wraps the queue", () => {
    player().playQueue([a, b], 1);
    player().cycleRepeat();
    player().next();
    expect(player().index).toBe(0);
    expect(player().isPlaying).toBe(true);
  });
  test("shuffle retains the current track and restores original order", () => {
    player().playQueue([a, b, c], 1);
    player().toggleShuffle();
    expect(player().queue[player().index]).toEqual(b);
    player().toggleShuffle();
    expect(player().queue).toEqual([a, b, c]);
    expect(player().index).toBe(1);
  });
  test("volume clamps and zero mutes", () => {
    player().setVolume(2);
    expect(player().volume).toBe(1);
    player().setVolume(0);
    expect(player().muted).toBe(true);
  });
  test("clearing the queue stops playback", () => {
    player().playQueue([a]);
    player().clearQueue();
    expect(player().queue).toEqual([]);
    expect(player().isPlaying).toBe(false);
  });
});

describe("queue regression cases", () => {
  test("empty shuffle never creates an undefined track", () => {
    player().toggleShuffle();
    expect(player().queue).toEqual([]);
  });
  test("an empty queue cannot start playback", () => {
    player().playQueue([]);
    expect(player().isPlaying).toBe(false);
    player().togglePlay();
    expect(player().isPlaying).toBe(false);
  });
  test("removal survives toggling shuffle", () => {
    player().playQueue([a, b, c]);
    player().toggleShuffle();
    const removed = player().queue[1];
    player().removeFromQueue(1);
    player().toggleShuffle();
    expect(player().queue).not.toContainEqual(removed);
    expect(player().queue).toHaveLength(2);
  });
  test("play-next survives toggling shuffle", () => {
    player().playQueue([a, b]);
    player().toggleShuffle();
    player().playNext(c);
    player().toggleShuffle();
    expect(player().queue).toContainEqual(c);
  });
  test("removing the last track resets playback state", () => {
    player().playQueue([a]);
    player().setDuration(100);
    player().setTime(25);
    player().removeFromQueue(0);
    expect(player().isPlaying).toBe(false);
    expect(player().currentTime).toBe(0);
    expect(player().duration).toBe(0);
  });
  test("removal distinguishes duplicate occurrences", () => {
    player().playQueue([a, b, a]);
    player().removeFromQueue(2);
    player().toggleShuffle();
    player().toggleShuffle();
    expect(player().queue).toEqual([a, b]);
  });
  test("non-finite seeks and volume do not corrupt state", () => {
    player().setVolume(Number.NaN);
    player().seek(Number.POSITIVE_INFINITY);
    expect(Number.isFinite(player().volume)).toBe(true);
    expect(Number.isFinite(player().currentTime)).toBe(true);
  });
});

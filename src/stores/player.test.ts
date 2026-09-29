/// <reference types="bun" />
import { describe, expect, it, beforeEach } from "bun:test";
import { usePlayer } from "./player";
import type { Track } from "@/lib/types";

function track(n: number): Track {
  return {
    id: String(n),
    url_id: String(n),
    lyric_id: String(n),
    source: "netease",
    name: `track ${n}`,
    artist: [`artist ${n}`],
    album: "album",
    pic_id: "p",
  };
}

const LIST = [track(1), track(2), track(3), track(4), track(5), track(6), track(7), track(8)];

const ids = (list: Track[]) =>
  list
    .map((t) => t.id)
    .join(",")
    .split(",");

beforeEach(() => {
  usePlayer.getState().clearQueue();
});

describe("shuffle", () => {
  // The reported bug: pressing the playlist page's shuffle button twice played
  // the list in order, because loading a new queue left `shuffle` set and the
  // second toggle turned it off.
  it("shuffles a freshly loaded queue when toggled", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();

    expect(usePlayer.getState().shuffle).toBe(true);
    expect(usePlayer.getState().queue).toHaveLength(LIST.length);
    // Same tracks, and the one that was playing is still first.
    expect([...ids(usePlayer.getState().queue)].sort()).toEqual([...ids(LIST)].sort());
    expect(usePlayer.getState().queue[0].id).toBe("1");
  });

  it("loads a new queue with shuffle off, so the button works every time", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();
    expect(usePlayer.getState().shuffle).toBe(true);

    usePlayer.getState().playQueue(LIST, 0);
    expect(usePlayer.getState().shuffle).toBe(false);

    usePlayer.getState().toggleShuffle();
    expect(usePlayer.getState().shuffle).toBe(true);
  });

  it("actually reorders, not just relabels the flag", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();
    // With 8 items a Fisher-Yates that returned the input order every time
    // would be a broken shuffle, not an unlucky one.
    const same = ids(usePlayer.getState().queue) === ids(LIST);
    expect(same).toBe(false);
  });

  it("restores the original order and keeps the same track playing", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();
    usePlayer.setState({ index: 3 });
    const playing = usePlayer.getState().queue[3].id;

    usePlayer.getState().toggleShuffle();
    const s = usePlayer.getState();
    expect(s.shuffle).toBe(false);
    expect(ids(s.queue)).toEqual(ids(LIST));
    expect(s.queue[s.index].id).toBe(playing);
  });

  it("does not put undefined in the queue when there is nothing to play", () => {
    usePlayer.getState().toggleShuffle();
    expect(usePlayer.getState().queue).toEqual([]);

    usePlayer.getState().playQueue([track(1)], 0);
    usePlayer.getState().removeFromQueue(0);
    // The old code read past the end of the array here and prepended
    // `undefined`, which then crashed the track list.
    usePlayer.getState().toggleShuffle();
    expect(usePlayer.getState().queue.every((t) => t != null)).toBe(true);
  });

  it("turns itself off when the queue is cleared", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();
    expect(usePlayer.getState().shuffle).toBe(true);

    usePlayer.getState().clearQueue();
    expect(usePlayer.getState().shuffle).toBe(false);
  });
});

describe("editing the queue while shuffled", () => {
  it("keeps a 'play next' track after un-shuffling", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();
    usePlayer.getState().playNext(track(99));

    usePlayer.getState().toggleShuffle();
    expect(ids(usePlayer.getState().queue)).toContain("99");
  });

  it("removes the same track from both orders", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().toggleShuffle();

    const victim = usePlayer.getState().queue[2];
    usePlayer.getState().removeFromQueue(2);

    expect(ids(usePlayer.getState().queue)).not.toContain(victim.id);
    // Index 2 of a shuffled list is a different track in the stored order, so
    // filtering by position used to delete the wrong one and keep the victim.
    expect(ids(usePlayer.getState().originalQueue)).not.toContain(victim.id);
  });

  it("leaves the stored order alone when reordering a shuffled queue", () => {
    usePlayer.getState().playQueue(LIST, 0);
    const original = ids(usePlayer.getState().originalQueue);
    usePlayer.getState().toggleShuffle();
    usePlayer.getState().moveInQueue(0, 3);

    expect(ids(usePlayer.getState().originalQueue)).toEqual(original);

    usePlayer.getState().toggleShuffle();
    expect(ids(usePlayer.getState().queue)).toEqual(original);
  });

  it("applies a reorder to the stored order when not shuffled", () => {
    usePlayer.getState().playQueue(LIST, 0);
    usePlayer.getState().moveInQueue(0, 3);

    expect(usePlayer.getState().queue[3].id).toBe("1");
    expect(ids(usePlayer.getState().queue)).toEqual(ids(usePlayer.getState().originalQueue));
  });
});

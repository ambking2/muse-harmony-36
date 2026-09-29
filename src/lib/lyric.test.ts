/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { hasRealLyrics, isSameSong, lyricLookupQueries, parseLrc } from "./gdmusic";

describe("parseLrc", () => {
  it("reads the common [mm:ss.xx] form", () => {
    const out = parseLrc("[00:25.241]سلام\n[00:30.299]دنیا");
    expect(out).toEqual([
      { time: 25.241, text: "سلام" },
      { time: 30.299, text: "دنیا" },
    ]);
  });

  it("pads a two-digit fraction to milliseconds", () => {
    const out = parseLrc("[00:01.5]یک");
    expect(out[0].time).toBeCloseTo(1.5, 3);
  });

  it("expands several timestamps on one line", () => {
    const out = parseLrc("[00:10.00][01:10.00]تکرار");
    expect(out.map((l) => l.time)).toEqual([10, 70]);
  });

  // Providers emit credit lines as a range — "[00:00.00-1]" — rather than a
  // point time. The old pattern needed "]" right after the fraction, so every
  // line of those sheets was skipped and the song came back with no lyrics.
  it("reads the range form [mm:ss.xx-n] and keeps the start time", () => {
    const out = parseLrc("[00:00.00-1] 作词 : Mohsen Yeganeh");
    expect(out).toEqual([{ time: 0, text: "作词 : Mohsen Yeganeh" }]);
  });

  it("reads a whole sheet written entirely in range form", () => {
    const out = parseLrc("[00:00.00-1] 作词\n[00:00.00-1] 作曲");
    expect(out).toHaveLength(2);
    expect(out.every((l) => l.time === 0)).toBe(true);
  });

  it("mixes both forms in one sheet", () => {
    const out = parseLrc("[00:00.00-1] 作词\n[00:25.241]خودت میخوای بری");
    expect(out).toHaveLength(2);
    expect(out[1].time).toBeCloseTo(25.241, 3);
  });

  it("drops lines with no timestamp", () => {
    expect(parseLrc("متن بدون زمان")).toEqual([]);
  });

  it("drops timestamped lines with no text", () => {
    expect(parseLrc("[00:10.00]   ")).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(parseLrc("")).toEqual([]);
  });

  it("sorts out-of-order lines by time", () => {
    const out = parseLrc("[00:30.00]دوم\n[00:10.00]اول");
    expect(out.map((l) => l.text)).toEqual(["اول", "دوم"]);
  });
});

// The fallback provider search can land on a track whose sheet is only the
// credit block. Treating that as "lyrics found" shows the user two lines of
// "作词 : …" and nothing else.
describe("hasRealLyrics", () => {
  const credits = parseLrc(
    "[00:00.00] 作词 : Shervin Hajipour\n[00:00.00] 作曲 : Shervin Hajipour",
  );

  it("rejects a sheet that is only credits", () => {
    expect(hasRealLyrics(credits)).toBe(false);
  });

  it("rejects an empty sheet", () => {
    expect(hasRealLyrics([])).toBe(false);
  });

  it("accepts a sheet with real words", () => {
    const real = parseLrc("[00:00.00] 作词 : X\n[00:10]یک\n[00:20]دو\n[00:30]سه");
    expect(hasRealLyrics(real)).toBe(true);
  });

  it("counts Persian and English credits as credits too", () => {
    const c = parseLrc("[00:00.00] ترانه سرا : الف\n[00:00.00] Lyricist: Someone");
    expect(hasRealLyrics(c)).toBe(false);
  });

  it("does not mistake an ordinary line for a credit", () => {
    const real = parseLrc("[00:10]دلم برای تو تنگ شده\n[00:20]بگو برگردیم\n[00:30]نمی‌خواهم");
    expect(hasRealLyrics(real)).toBe(true);
  });
});

// The fallback searches another provider for the same song. Measured live,
// that search happily returns a different song that happens to share a title,
// so these pairs decide whether the player shows the right words.
describe("isSameSong", () => {
  it("accepts the same title by the same artist", () => {
    expect(
      isSameSong(
        { name: "Baraye Azadi", artist: ["Shervin Hajipour"] },
        { name: "Baraye Azadi", artist: ["Shervin Hajipour"] },
      ),
    ).toBe(true);
  });

  it("matches through decoration differences", () => {
    expect(
      isSameSong(
        { name: "Baraye Azadi (feat. Shervin Hajipour)", artist: ["Káss", "Shervin Hajipour"] },
        { name: "Baraye Azadi", artist: ["Shervin Hajipour"] },
      ),
    ).toBe(true);
  });

  it("rejects a completely different song", () => {
    expect(
      isSameSong(
        { name: "Potk", artist: ["Shervin Hajipour"] },
        { name: "Baraye", artist: ["Shervin Hajipour"] },
      ),
    ).toBe(false);
  });

  it("rejects a same-titled song by a different artist", () => {
    expect(
      isSameSong(
        { name: "Roommate", artist: ["Googoosh"] },
        { name: "Roommate", artist: ["Some Other Band"] },
      ),
    ).toBe(false);
  });

  it("accepts a close title when the artists agree", () => {
    expect(
      isSameSong(
        { name: "Farar Kon", artist: ["Shervin Hajipour"] },
        { name: "Farar kon (Mixtape)", artist: ["Shervin Hajipour"] },
      ),
    ).toBe(true);
  });
});

describe("lyricLookupQueries", () => {
  it("strips the featured-artist decoration", () => {
    const q = lyricLookupQueries({
      name: "Baraye Azadi (feat. Shervin Hajipour)",
      artist: ["Káss"],
    });
    expect(q).toContain("Baraye Azadi");
  });

  it("tries the decorated form too, in case the provider has it verbatim", () => {
    const q = lyricLookupQueries({ name: "Azizam (feat. Googoosh) [Persian Version]", artist: [] });
    expect(q[0]).toBe("Azizam (feat. Googoosh) [Persian Version]");
  });

  it("never returns duplicates", () => {
    const q = lyricLookupQueries({ name: "Potk", artist: [] });
    expect(new Set(q).size).toBe(q.length);
  });
});

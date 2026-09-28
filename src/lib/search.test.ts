import { describe, expect, test } from "bun:test";
import { normalizeFa, skeleton, similarity, stripDecorations, transliterateFa } from "./text";
import { latinAliasFor, needsAlias, resolveLatinQuery } from "./aliases";
import { isExplicit, isJunk, filterJunk } from "./quality";
import { rankTracks, scoreTrack, queryVariants, dedupeTracks } from "./search";
import type { Track } from "./types";

const track = (p: Partial<Track> & { name: string; artist: string[] }): Track =>
  ({
    id: p.id ?? "x1",
    album: p.album ?? "",
    pic_id: "",
    url_id: "",
    lyric_id: "",
    source: p.source ?? "netease",
    ...p,
  }) as Track;

describe("normalizeFa", () => {
  test("folds Arabic yeh/kaf to Persian", () => {
    expect(normalizeFa("يگانه")).toBe("یگانه");
    expect(normalizeFa("گوگوش")).toBe(normalizeFa("گوگوش"));
  });

  test("strips ZWNJ and diacritics", () => {
    expect(normalizeFa("محسِن یگانه")).toBe("محسن یگانه");
    expect(normalizeFa("بنیامین\u200cبهزاد")).toBe("بنیامین بهزاد");
  });

  test("converts Persian and Arabic digits", () => {
    expect(normalizeFa("۱۲۳")).toBe("123");
    expect(normalizeFa("٤٥٦")).toBe("456");
  });

  test("is empty for blank input", () => {
    expect(normalizeFa("")).toBe("");
    expect(normalizeFa("   ")).toBe("");
  });
});

describe("stripDecorations", () => {
  test("removes bracketed suffixes and remix tails", () => {
    expect(stripDecorations("Baraye (Frau, Leben, Freiheit)")).toBe("Baraye");
    expect(stripDecorations("Yalan - Remastered 2011")).toBe("Yalan");
  });
});

describe("skeleton", () => {
  test("lines up across scripts for a known name", () => {
    // The contract is "close enough to match", not "character-identical":
    // Persian and its romanisation share consonants but not vowels, and
    // spellings differ per artist ("Siavash" vs "Siavesh").
    const pairs: [string, string][] = [
      ["محسن یگانه", "Mohsen Yeganeh"],
      ["سیاوش قمیشی", "Siavash Ghomayshi"],
      ["بنیامین بهزاد", "Benyamin Behzad"],
      ["علیرضا طلیسچی", "Alireza Talischi"],
      ["امیر تتلو", "Amir Tataloo"],
      ["رضا بهرام", "Reza Bahram"],
      ["داریوش اقبالی", "Dariush Eghbali"],
    ];
    for (const [fa, en] of pairs) {
      expect(similarity(skeleton(fa), skeleton(en))).toBeGreaterThan(0.7);
    }
  });

  test("keeps unrelated names apart", () => {
    expect(similarity(skeleton("محسن یگانه"), skeleton("Eminem"))).toBeLessThan(0.4);
    expect(similarity(skeleton("گوگوش"), skeleton("Dariush"))).toBeLessThan(0.4);
  });

  test("ignores vowels on both sides", () => {
    expect(skeleton("Yalan")).toBe(skeleton("yalan"));
  });

  test("similarity is symmetric and bounded", () => {
    expect(similarity("mhsn", "mhsn")).toBe(1);
    expect(similarity("abc", "xyz")).toBe(0);
    expect(similarity("mhsn", "mhsnx")).toBeCloseTo(similarity("mhsnx", "mhsn"), 5);
  });
});

describe("transliterateFa", () => {
  test("produces a latin query for Persian input", () => {
    expect(transliterateFa("محسن")).toMatch(/^[a-z]+$/);
  });

  test("passes latin input through unchanged", () => {
    expect(transliterateFa("eminem")).toBe("eminem");
  });
});

describe("aliases", () => {
  test("resolves artists, songs and genres", () => {
    expect(latinAliasFor("محسن یگانه")).toBe("Mohsen Yeganeh");
    expect(latinAliasFor("چمدون")).toBe("Chamedoon");
    expect(latinAliasFor("رپ فارسی")).toBe("Persian rap");
  });

  test("is tolerant of Arabic letter variants and ZWNJ", () => {
    expect(latinAliasFor("محسن يگانه")).toBe("Mohsen Yeganeh");
    expect(latinAliasFor("بنیامین‌بهزاد")).toBe("Benyamin Behzad");
  });

  test("resolves a known artist inside a longer query", () => {
    expect(resolveLatinQuery("آهنگ محسن یگانه")).toBe("Mohsen Yeganeh");
  });

  test("returns null for unknown input", () => {
    expect(latinAliasFor("یک چیز ناشناخته")).toBeNull();
    expect(needsAlias("eminem")).toBe(false);
    expect(needsAlias("محسن")).toBe(true);
  });
});

describe("queryVariants", () => {
  test("puts the curated alias first for Persian queries", () => {
    expect(queryVariants("محسن یگانه")[0]).toBe("Mohsen Yeganeh");
  });

  test("keeps latin queries untouched", () => {
    expect(queryVariants("eminem")).toEqual(["eminem"]);
  });
});

describe("quality filter", () => {
  const real = track({ name: "Yalan", artist: ["Mohsen Yeganeh"] });
  const aiSpam = track({ name: "آهنگ هوش مصنوعی امیر تتلو من میکم", artist: ["دنیای موزیک"] });
  const seoSpam = track({ name: "آهنگ پاپ ایرانی _بی تو", artist: ["Music FP"] });
  const streetCover = track({ name: "اجرای خیابانی آهنگ گوگوش", artist: ["Street Musician"] });

  test("keeps legitimate catalogue rows", () => {
    for (const t of [
      real,
      track({ name: "Baraye", artist: ["Shervin Hajipour"] }),
      track({ name: "Gol Bi Goldoon", artist: ["Googoosh"] }),
      track({ name: "Without Me", artist: ["Eminem"] }),
    ]) {
      expect(isJunk(t)).toBe(false);
    }
  });

  test("drops AI, SEO and cover uploads", () => {
    for (const t of [aiSpam, seoSpam, streetCover]) expect(isJunk(t)).toBe(true);
  });

  test("drops explicit uploads", () => {
    expect(isJunk(track({ name: "Sexo Explicit", artist: ["X"] }))).toBe(true);
    // "cum" only counts as a whole word, so it cannot fire inside "document".
    expect(isExplicit(track({ name: "Document", artist: ["X"] }))).toBe(false);
    expect(isExplicit(track({ name: "Cum inside", artist: ["X"] }))).toBe(true);
  });

  test("filterJunk preserves the real rows", () => {
    expect(filterJunk([real, aiSpam, seoSpam, streetCover])).toEqual([real]);
  });
});

describe("scoreTrack and rankTracks", () => {
  const yeganeh = track({ name: "Yalan", artist: ["Mohsen Yeganeh"], id: "a" });
  const other = track({ name: "Eminem Song", artist: ["Eminem"], id: "b" });

  test("scores a matching artist above an unrelated row", () => {
    expect(scoreTrack(yeganeh, "محسن یگانه")).toBeGreaterThan(scoreTrack(other, "محسن یگانه"));
  });

  test("penalises rows missing tokens of a multi-word query", () => {
    const partial = track({ name: "Yeganeh Only", artist: ["Unknown"], id: "c" });
    expect(scoreTrack(yeganeh, "محسن یگانه")).toBeGreaterThan(scoreTrack(partial, "محسن یگانه"));
  });

  test("curated providers outrank upload mirrors on equal score", () => {
    // Same row from both providers, so only the trust multiplier separates them.
    const curated = track({
      name: "Siavash Ghomayshi",
      artist: ["Siavash Ghomayshi"],
      id: "d",
      source: "netease",
    });
    const mirror = track({
      name: "Siavash Ghomayshi",
      artist: ["Siavash Ghomayshi"],
      id: "e",
      source: "joox",
    });
    const ranked = rankTracks([mirror, curated], "سیاوش قمیشی", { keepUnmatched: true });
    expect(ranked[0].id).toBe("d");
  });

  test("honours the per-track weight map", () => {
    const a = track({ name: "Siavash Ghomayshi", artist: ["Siavash Ghomayshi"], id: "w1" });
    const b = track({ name: "Siavash Ghomayshi", artist: ["Siavash Ghomayshi"], id: "w2" });
    const ranked = rankTracks([a, b], "سیاوش قمیشی", {
      keepUnmatched: true,
      weights: new Map([
        ["netease:w1", 0.1],
        ["netease:w2", 5],
      ]),
    });
    expect(ranked[0].id).toBe("w2");
  });

  test("dedupeTracks collapses duplicates by id and by name+artist", () => {
    const dup = track({ name: "Yalan", artist: ["Mohsen Yeganeh"], id: "a" });
    const fuzzy = track({ name: "Yalan", artist: ["Mohsen Yeganeh"], id: "z" });
    expect(dedupeTracks([dup, dup, fuzzy])).toHaveLength(1);
  });
});

/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { decodeTrackShareKey, trackShareKey } from "./share-link";
import type { Track } from "./types";

const sample: Track = {
  id: "1973665667",
  name: "دلم گرفته از تو",
  artist: ["سیروان خسروی", "آرمان گلابی"],
  album: "چون عشق",
  pic_id: "109951170483249998",
  url_id: "url-1973665667",
  // The app always sets this to the track id, and the compact form relies on
  // that instead of spending bytes on it.
  lyric_id: "1973665667",
  source: "netease",
};

describe("trackShareKey", () => {
  it("round-trips every field needed to play the track", () => {
    const back = decodeTrackShareKey(trackShareKey(sample));
    expect(back).toEqual(sample);
  });

  it("produces a URL-safe key", () => {
    // base64url alphabet only — otherwise the segment breaks routing.
    expect(trackShareKey(sample)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("survives Persian text and punctuation", () => {
    const tricky: Track = {
      ...sample,
      name: "عشق؟ «تو» — ۱۰۰٪",
      artist: ["محسن یگانه"],
    };
    expect(decodeTrackShareKey(trackShareKey(tricky))).toEqual(tricky);
  });

  it("keeps several artists apart", () => {
    const back = decodeTrackShareKey(trackShareKey(sample));
    expect(back?.artist).toEqual(["سیروان خسروی", "آرمان گلابی"]);
  });

  // The contract is not an arbitrary character budget — it is that the compact
  // form is materially shorter than the JSON key it replaced, for the same
  // track. On a real Iranian title with two artists this is 172 against 268;
  // on a shorter one it is 119 against 222.
  it("is materially shorter than the JSON key it replaced", () => {
    const real: Track = { ...sample, url_id: sample.id };
    const compact = trackShareKey(real).length;
    const legacy = Buffer.from(
      JSON.stringify({
        n: real.name,
        a: real.artist,
        b: real.album,
        s: real.source,
        i: real.id,
        p: real.pic_id,
        u: real.url_id,
        l: real.lyric_id,
      }),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "").length;
    expect(compact).toBeLessThan(legacy * 0.75);
  });

  it("drops the url id when it is the same as the track id", () => {
    const same: Track = { ...sample, url_id: sample.id };
    const back = decodeTrackShareKey(trackShareKey(same));
    expect(back?.url_id).toBe(sample.id);
  });

  it("keeps a distinct url id", () => {
    expect(decodeTrackShareKey(trackShareKey(sample))?.url_id).toBe("url-1973665667");
  });

  it("derives the lyric id from the track id", () => {
    expect(decodeTrackShareKey(trackShareKey(sample))?.lyric_id).toBe("1973665667");
  });

  it("handles a joox track, whose ids contain + and =", () => {
    const joox: Track = {
      ...sample,
      id: "lcf8Hbm+iId4yrLGF8C2uw==",
      url_id: "lcf8Hbm+iId4yrLGF8C2uw==",
      lyric_id: "lcf8Hbm+iId4yrLGF8C2uw==",
      source: "joox",
    };
    expect(decodeTrackShareKey(trackShareKey(joox))).toEqual(joox);
  });

  it("copes with an empty album and no artwork", () => {
    const bare: Track = { ...sample, album: "", pic_id: "" };
    const back = decodeTrackShareKey(trackShareKey(bare));
    expect(back?.album).toBe("");
    expect(back?.pic_id).toBe("");
  });

  it("returns null for a truncated link rather than a half-built track", () => {
    const key = trackShareKey(sample);
    expect(decodeTrackShareKey(key.slice(0, key.length - 8))).toBeNull();
  });

  it("returns null for junk", () => {
    expect(decodeTrackShareKey("not-base64!!")).toBeNull();
    expect(decodeTrackShareKey("")).toBeNull();
  });
});

describe("decodeTrackShareKey — links shared before the compact format", () => {
  const legacy = (o: unknown) =>
    Buffer.from(JSON.stringify(o), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  it("still opens a full legacy payload", () => {
    const back = decodeTrackShareKey(
      legacy({
        n: "دلم گرفته از تو",
        a: ["سیروان خسروی", "آرمان گلابی"],
        b: "چون عشق",
        s: "netease",
        i: "1973665667",
        p: "109951170483249998",
        u: "url-1973665667",
        l: "lyric-1973665667",
      }),
    );
    // The legacy format stored its own lyric id, and it is preserved as-is
    // rather than being replaced by the track id.
    expect(back).toEqual({ ...sample, lyric_id: "lyric-1973665667" });
  });

  it("falls back to the song id when the link carries no url id", () => {
    const minimal = decodeTrackShareKey(legacy({ i: "42", s: "netease" }));
    expect(minimal?.id).toBe("42");
    expect(minimal?.url_id).toBe("42");
  });

  it("rejects a legacy payload with no id", () => {
    expect(decodeTrackShareKey(legacy({ n: "x" }))).toBeNull();
  });
});

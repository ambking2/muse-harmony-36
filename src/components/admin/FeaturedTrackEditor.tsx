import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { searchSmart } from "@/lib/gdmusic";
import { trackKey, type Track } from "@/lib/types";
import type { FeaturedPlaylist } from "@/lib/featured";

export function FeaturedTrackEditor({ item }: { item: FeaturedPlaylist }) {
  const [tracks, setTracks] = useState<Track[]>(item.tracks ?? []);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(Array.isArray(item.tracks));
  const [dirty, setDirty] = useState(false);

  const loadCurrent = async () => {
    setBusy(true);
    try {
      const found = await searchSmart(item.query || item.title, { count: 30, iranianFirst: item.group === "ایرانی" });
      setTracks(found);
      setLoaded(true);
      setDirty(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "دریافت آهنگ‌ها ناموفق بود");
    } finally { setBusy(false); }
  };

  const search = async () => {
    if (!term.trim()) return;
    setBusy(true);
    try { setResults(await searchSmart(term, { count: 15, iranianFirst: item.group === "ایرانی" })); }
    catch (error) { alert(error instanceof Error ? error.message : "جستجو ناموفق بود"); }
    finally { setBusy(false); }
  };

  const add = (track: Track) => {
    if (tracks.some((t) => trackKey(t) === trackKey(track))) return;
    setTracks((old) => [...old, track]);
    setLoaded(true);
    setDirty(true);
  };
  const remove = (index: number) => {
    setTracks((old) => old.filter((_, i) => i !== index));
    setDirty(true);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    setTracks((old) => {
      const next = [...old];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin?featured=" + encodeURIComponent(item.id), {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tracks }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره آهنگ‌ها ناموفق بود");
      setDirty(false);
      alert("ترتیب و آهنگ‌های پلی‌لیست ذخیره شد");
    } catch (error) {
      alert(error instanceof Error ? error.message : "ذخیره ناموفق بود");
    } finally { setSaving(false); }
  };

  return <div className="space-y-3 rounded-xl border border-ios-separator p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-semibold">مدیریت آهنگ‌ها</p><p className="type-footnote text-ios-label-secondary">{loaded ? tracks.length.toLocaleString("fa-IR") + " آهنگ انتخاب‌شده" : "هنوز فهرست آهنگ‌ها دستی ثبت نشده"}</p></div>
      {!loaded && <button className="btn btn-gray h-9 min-h-9 px-3" disabled={busy} onClick={() => void loadCurrent()}>{busy ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>} بارگذاری آهنگ‌های فعلی</button>}
      {loaded && <button className="btn btn-filled h-9 min-h-9 px-3" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <Loader2 className="size-4 animate-spin"/> : null} ذخیره فهرست آهنگ‌ها</button>}
    </div>
    {loaded && <>
      <div className="flex gap-2">
        <input className="min-h-10 min-w-0 flex-1 rounded-xl bg-ios-fill px-3" placeholder="نام آهنگ یا خواننده برای افزودن…" value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }}/>
        <button className="btn btn-gray h-10 min-h-10 px-3" disabled={busy || !term.trim()} onClick={() => void search()}>{busy ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>} جستجو</button>
      </div>
      {results.length > 0 && <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl bg-ios-fill p-2">
        {results.map((track) => <div key={trackKey(track)} className="flex items-center gap-2 py-1">
          <div className="min-w-0 flex-1"><p className="truncate text-sm">{track.name}</p><p className="truncate text-xs text-ios-label-secondary">{track.artist.join("، ")}</p></div>
          <button className="btn btn-gray h-8 min-h-8 px-2" onClick={() => add(track)} disabled={tracks.some((t) => trackKey(t) === trackKey(track))}><Plus className="size-4"/> افزودن</button>
        </div>)}
      </div>}
      <div className="max-h-[28rem] space-y-1 overflow-y-auto">
        {tracks.map((track, index) => <div key={trackKey(track)} className="flex items-center gap-2 rounded-lg bg-ios-fill px-2 py-2">
          <span className="w-6 shrink-0 text-center text-xs text-ios-label-tertiary">{(index + 1).toLocaleString("fa-IR")}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm">{track.name}</p><p className="truncate text-xs text-ios-label-secondary">{track.artist.join("، ")}</p></div>
          <button className="rounded-lg p-1.5 disabled:opacity-30" aria-label="بالا" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4"/></button>
          <button className="rounded-lg p-1.5 disabled:opacity-30" aria-label="پایین" disabled={index === tracks.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4"/></button>
          <button className="rounded-lg p-1.5 text-ios-red" aria-label="حذف آهنگ" onClick={() => remove(index)}><Trash2 className="size-4"/></button>
        </div>)}
        {tracks.length === 0 && <p className="py-5 text-center text-sm text-ios-label-secondary">این پلی‌لیست فعلاً خالی است؛ با جستجو آهنگ اضافه کن.</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ios-separator pt-2">
        <button className="btn btn-gray h-9 min-h-9 px-3" onClick={() => { if (confirm("فهرست دستی حذف شود و پلی‌لیست دوباره از عبارت جستجو ساخته شود؟")) { setTracks([]); setDirty(true); } }}>خالی‌کردن فهرست</button>
        <button className="btn btn-filled h-9 min-h-9 px-3" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "در حال ذخیره…" : "ذخیره آهنگ‌ها"}</button>
      </div>
    </>}
  </div>;
}

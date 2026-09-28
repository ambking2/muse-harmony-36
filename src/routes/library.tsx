import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { TrackRow } from "@/components/music/TrackRow";
import { trackKey } from "@/lib/types";
import { useState } from "react";
import { Clock, ListMusic, Music, Plus, Play, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeFa } from "@/lib/text";

const TABS = [
  { id: "songs", label: "آهنگ‌ها", icon: Music },
  { id: "playlists", label: "پلی‌لیست‌ها", icon: ListMusic },
  { id: "history", label: "تاریخچه", icon: Clock },
] as const;

type Tab = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const library = useLibrary((s) => s.library);
  const playlists = useLibrary((s) => s.playlists);
  const history = useLibrary((s) => s.history);
  const tracksById = useLibrary((s) => s.tracksById);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const removeFromLibrary = useLibrary((s) => s.removeFromLibrary);
  const playQueue = usePlayer((s) => s.playQueue);

  const [tab, setTab] = useState<Tab>("songs");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const recent = history.map((h) => tracksById[h.key]).filter(Boolean);

  // Persian-aware local filter so a half-typed name still matches.
  const q = normalizeFa(filter);
  const songs = q
    ? library.filter(
        (t) =>
          normalizeFa(t.name).includes(q) ||
          t.artist.some((a) => normalizeFa(a).includes(q)) ||
          normalizeFa(t.album ?? "").includes(q),
      )
    : library;
  const historyList = q
    ? recent.filter(
        (t) => normalizeFa(t.name).includes(q) || t.artist.some((a) => normalizeFa(a).includes(q)),
      )
    : recent;

  const submitPlaylist = () => {
    const name = newName.trim();
    if (!name) return;
    createPlaylist(name);
    setNewName("");
    setCreating(false);
    setTab("playlists");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="موسیقی شما"
          title="کتابخانه"
          action={
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Plus className="size-4" /> پلی‌لیست جدید
            </button>
          }
        />

        <div className="glass inline-flex rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
              {t.id === "songs" && library.length > 0 && (
                <span className="text-[10px] opacity-70 ltr-nums">
                  {library.length.toLocaleString("fa-IR")}
                </span>
              )}
            </button>
          ))}
        </div>

        {(tab === "songs" || tab === "history") && (
          <div className="glass flex items-center gap-2 rounded-2xl p-2">
            <Search className="ms-2 size-4 shrink-0 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="فیلتر در کتابخانه…"
              className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="rounded-full p-1.5 text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {tab === "songs" &&
          (songs.length === 0 ? (
            <Empty
              icon={<Music className="size-8" />}
              text={q ? "آهنگی با این فیلتر پیدا نشد." : "هنوز آهنگی ذخیره نکرده‌اید."}
            />
          ) : (
            <>
              {songs.length > 1 && (
                <button
                  onClick={() => playQueue(songs, 0)}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                >
                  <Play className="size-4" /> پخش همه
                </button>
              )}
              <div className="space-y-1">
                {songs.map((t, i) => (
                  <div key={trackKey(t)} className="group">
                    <TrackRow track={t} list={songs} index={i} showIndex />
                    <button
                      onClick={() => removeFromLibrary(trackKey(t))}
                      className="hidden text-[11px] text-muted-foreground underline hover:text-destructive sm:block sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      حذف از کتابخانه
                    </button>
                  </div>
                ))}
              </div>
            </>
          ))}

        {tab === "playlists" &&
          (playlists.length === 0 ? (
            <Empty icon={<ListMusic className="size-8" />} text="هنوز پلی‌لیستی نساخته‌اید." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {playlists.map((p) => (
                <Link
                  key={p.id}
                  to="/playlist/$id"
                  params={{ id: p.id }}
                  className="glass rounded-2xl p-4 transition hover:bg-white/10"
                >
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Music className="size-8" />
                  </div>
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground ltr-nums">
                    {p.trackKeys.length.toLocaleString("fa-IR")} آهنگ
                  </div>
                </Link>
              ))}
            </div>
          ))}

        {tab === "history" &&
          (historyList.length === 0 ? (
            <Empty icon={<Clock className="size-8" />} text="هنوز چیزی پخش نکرده‌اید." />
          ) : (
            <div className="space-y-1">
              {historyList.map((t, i) => (
                <TrackRow key={`${trackKey(t)}-${i}`} track={t} list={historyList} index={i} />
              ))}
            </div>
          ))}
      </div>

      {creating && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setCreating(false)}
        >
          <div
            className="glass-strong w-full max-w-sm rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold">پلی‌لیست جدید</h2>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPlaylist()}
              placeholder="مثلاً: آهنگ‌های شب"
              className="mt-4 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-primary/60"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={submitPlaylist}
                disabled={!newName.trim()}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                ساختن
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">
      <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-white/5">
        {icon}
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

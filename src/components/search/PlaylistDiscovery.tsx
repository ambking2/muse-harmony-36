import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListMusic, Play, Shuffle, Loader2 } from "lucide-react";

import { TrackThumb } from "@/components/search/Rails";
import { searchSmart } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";

/**
 * Browse collections built from live catalogue results. These are playable
 * collections, not decorative cards: each card resolves real tracks and hands
 * the complete result set to the shared player queue.
 */
const COLLECTIONS = [
  { title: "پاپ ایرانی", query: "پاپ ایرانی", emoji: "🎤", group: "ایرانی" },
  { title: "رپ فارسی", query: "رپ فارسی", emoji: "🎙️", group: "ایرانی" },
  { title: "عاشقانه", query: "آهنگ عاشقانه ایرانی", emoji: "❤️", group: "حال‌وهوا" },
  { title: "غمگین و احساسی", query: "آهنگ غمگین ایرانی", emoji: "🌧️", group: "حال‌وهوا" },
  { title: "انرژی و ورزش", query: "موسیقی پرانرژی ورزش", emoji: "⚡", group: "موقعیت" },
  { title: "رانندگی", query: "آهنگ مخصوص رانندگی", emoji: "🚘", group: "موقعیت" },
  { title: "شب و نیمه‌شب", query: "آهنگ شبانه آرام", emoji: "🌙", group: "موقعیت" },
  { title: "آرامش و تمرکز", query: "موسیقی آرامش بخش بی کلام", emoji: "🌿", group: "موقعیت" },
  { title: "نوستالژی ایرانی", query: "آهنگ نوستالژی ایرانی", emoji: "📻", group: "ایرانی" },
  { title: "موسیقی سنتی", query: "موسیقی سنتی ایرانی", emoji: "🪕", group: "ایرانی" },
  { title: "موسیقی بی‌کلام", query: "موسیقی بی کلام", emoji: "🎹", group: "سبک" },
  { title: "راک", query: "موسیقی راک", emoji: "🎸", group: "سبک" },
  { title: "الکترونیک", query: "موسیقی الکترونیک", emoji: "🪩", group: "سبک" },
  { title: "لوفای", query: "lofi chill beats", emoji: "☁️", group: "سبک" },
  { title: "پیانو", query: "موسیقی پیانو آرام", emoji: "🎹", group: "نسخه‌های خاص" },
  { title: "آکوستیک", query: "آهنگ acoustic", emoji: "🎻", group: "نسخه‌های خاص" },
  { title: "ریمیکس", query: "ریمیکس آهنگ ایرانی", emoji: "🔊", group: "نسخه‌های خاص" },
  { title: "اجرای زنده", query: "اجرای زنده موسیقی ایرانی", emoji: "🎙️", group: "نسخه‌های خاص" },
  { title: "موسیقی ترکی", query: "Turkish pop", emoji: "🇹🇷", group: "بین‌المللی" },
  { title: "پاپ انگلیسی", query: "English pop hits", emoji: "🌍", group: "بین‌المللی" },
  { title: "موسیقی عربی", query: "Arabic music", emoji: "🌙", group: "بین‌المللی" },
  { title: "موسیقی هندی", query: "Hindi songs", emoji: "🎬", group: "بین‌المللی" },
  { title: "موسیقی فیلم", query: "موسیقی متن فیلم", emoji: "🎞️", group: "سبک" },
  { title: "خواب و مدیتیشن", query: "sleep meditation ambient music", emoji: "💤", group: "موقعیت" },
] as const;

const GROUPS = ["همه", "ایرانی", "حال‌وهوا", "موقعیت", "سبک", "نسخه‌های خاص", "بین‌المللی"] as const;

const FEATURED = [
  COLLECTIONS[2],
  COLLECTIONS[3],
  COLLECTIONS[4],
  COLLECTIONS[5],
  COLLECTIONS[8],
  COLLECTIONS[10],
  COLLECTIONS[14],
  COLLECTIONS[18],
] as const;

export function PlaylistDiscovery({ onPick }: { onPick: (query: string) => void }) {
  return (
    <div className="mt-7 space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between px-4">
          <div>
            <h2 className="type-title-2">کشف پلی‌لیست‌ها</h2>
            <p className="type-footnote mt-1 text-ios-label-secondary">
              برای هر حال‌وهوا، یک مسیر تازه برای شنیدن موسیقی
            </p>
          </div>
          <ListMusic className="size-5 text-ios-tint" aria-hidden />
        </div>
        <CategoryBrowser onPick={onPick} />
      </section>

      <section>
        <div className="mb-3 px-4">
          <h2 className="type-title-2">منتخب برای شروع</h2>
          <p className="type-footnote mt-1 text-ios-label-secondary">
            مجموعه‌ها از آهنگ‌های واقعی کاتالوگ ساخته می‌شوند.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3">
          {FEATURED.map((collection) => (
            <PlayableCollection key={collection.query} collection={collection} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoryBrowser({ onPick }: { onPick: (query: string) => void }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("همه");
  const visible = group === "همه" ? COLLECTIONS : COLLECTIONS.filter((item) => item.group === group);

  return (
    <div>
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="فیلتر دسته‌بندی">
        {GROUPS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setGroup(item)}
            aria-pressed={group === item}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${group === item ? "bg-ios-tint text-white" : "panel text-ios-label-secondary"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3">
        {visible.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => onPick(item.query)}
            className="panel press flex min-h-[74px] items-center gap-3 p-3 text-right"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ios-fill text-xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="min-w-0">
              <span className="type-headline block truncate">{item.title}</span>
              <span className="type-caption mt-1 block text-ios-label-secondary">مشاهده آهنگ‌ها</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayableCollection({ collection }: { collection: (typeof FEATURED)[number] }) {
  const playQueue = usePlayer((state) => state.playQueue);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const { data: tracks = [], isLoading, isError } = useQuery({
    queryKey: ["playlist-discovery", collection.query],
    queryFn: () => searchSmart(collection.query, { count: 18, iranianFirst: true }),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });

  const start = (shuffle: boolean) => {
    if (!tracks.length) return;
    playQueue(tracks, 0);
    if (shuffle) toggleShuffle();
  };

  return (
    <article className="panel overflow-hidden">
      <button type="button" onClick={() => start(false)} disabled={!tracks.length} className="press relative block w-full text-right" aria-label={`پخش پلی‌لیست ${collection.title}`}>
        <div className="relative aspect-square overflow-hidden bg-ios-fill">
          {tracks[0] ? (
            <TrackThumb track={tracks[0]} className="size-full rounded-none object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-ios-tint/20 to-ios-indigo/20 text-4xl" aria-hidden>
              {collection.emoji}
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-white">
            <span className="text-sm font-medium">{isLoading ? "در حال آماده‌سازی…" : isError ? "بارگذاری ناموفق" : `${tracks.length.toLocaleString("fa-IR")} آهنگ`}</span>
            {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5 fill-current" strokeWidth={0} />}
          </span>
        </div>
      </button>
      <div className="p-3">
        <div className="type-headline truncate">{collection.title}</div>
        <p className="type-footnote mt-1 line-clamp-2 text-ios-label-secondary">{collection.query}</p>
        <button type="button" onClick={() => start(true)} disabled={!tracks.length} className="btn btn-gray mt-3 w-full justify-center disabled:opacity-45">
          <Shuffle className="size-4" />
          پخش تصادفی
        </button>
      </div>
    </article>
  );
}


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link2 as LinkIcon, Loader2, Play, Pause, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { Artwork } from "@/components/music/Artwork";
import { decodeTrackShareKey, shareTrack } from "@/lib/share-link";
import { trackKey } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";

export const Route = createFileRoute("/t/$key")({
  // Resolved on the server so a shared link renders (and unfurls) as the track
  // itself rather than an empty shell waiting for hydration.
  loader: ({ params }) => decodeTrackShareKey(params.key),
  head: ({ match }) => {
    const t = match.loaderData;
    const title = t ? `${t.name}${t.artist[0] ? ` — ${t.artist[0]}` : ""}` : "muis";
    return {
      meta: [
        { title: `${title} — muis` },
        { name: "description", content: t?.name ?? "muis — پخش‌کننده‌ی موسیقی فارسی" },
      ],
    };
  },
  component: SharedTrackPage,
});

/**
 * Landing page for a shared track link. It resolves the track, starts playing
 * it, and gets out of the way — the point of the link is the music, not a form.
 */
function SharedTrackPage() {
  const navigate = useNavigate();
  const resolved = Route.useLoaderData();

  // The sender's own copy of the track is the most complete one we have.
  const libraryTrack = useLibrary((s) => (resolved ? s.tracksById[trackKey(resolved)] : undefined));

  const isPlaying = usePlayer((s) => s.isPlaying);
  const active = usePlayer((s) => s.queue[s.index]);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const playTrack = usePlayer((s) => s.playTrack);
  const autoPlayedKey = useRef("");

  useEffect(() => {
    if (!resolved) return;
    const resolvedKey = trackKey(resolved);
    // React StrictMode can run mount effects twice in development. Do not
    // reset playback to 0 on the duplicate pass for the same shared track.
    if (autoPlayedKey.current === resolvedKey) return;
    autoPlayedKey.current = resolvedKey;
    playTrack(resolved, [resolved]);
  }, [resolved, playTrack]);

  const shown = libraryTrack ?? resolved;

  if (!resolved) {
    return (
      <AppShell>
        <EmptyState
          icon={LinkIcon}
          title="این لینک معتبر نیست"
          description="بخشی از لینک کپی نشده یا تغییر کرده است. لطفاً دوباره از دکمه‌ی اشتراک استفاده کنید."
          className="min-h-[60vh] justify-center"
          action={
            <Link to="/explore" className="btn btn-filled">
              رفتن به جستجو
            </Link>
          }
        />
      </AppShell>
    );
  }

  if (!shown) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-ios-label-secondary" />
        </div>
      </AppShell>
    );
  }

  const isCurrent = !!active && trackKey(active) === trackKey(shown);
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <p className="type-footnote text-ios-label-secondary">به اشتراک گذاشته شده</p>

          <div className="mt-4 overflow-hidden rounded-sheet shadow-2xl shadow-black/60">
            <Artwork
              track={shown}
              size={600}
              className="aspect-square w-full"
              rounded="rounded-sheet"
            />
          </div>

          <h1 className="type-title-1 mt-6 text-balance">{shown.name}</h1>
          {shown.artist.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
              {shown.artist.map((a) => (
                <Link
                  key={a}
                  to="/artist/$name"
                  params={{ name: a }}
                  className="type-callout text-ios-tint"
                >
                  {a}
                </Link>
              ))}
            </div>
          )}
          {shown.album && (
            <Link
              to="/album/$name"
              params={{ name: shown.album }}
              className="type-footnote mt-1 block truncate text-ios-label-secondary"
            >
              {shown.album}
            </Link>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (isCurrent ? togglePlay() : playTrack(shown, [shown]))}
              className="press grid size-16 shrink-0 place-items-center rounded-full bg-ios-tint text-white shadow-xl shadow-black/30"
              aria-label={isCurrent && isPlaying ? "توقف" : "پخش"}
            >
              {isCurrent && isPlaying ? (
                <Pause className="size-7 fill-current" strokeWidth={0} />
              ) : (
                <Play className="size-7 translate-x-px fill-current" strokeWidth={0} />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/now-playing" })}
              className="btn btn-gray flex-1"
            >
              صفحه‌ی پخش
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void shareTrack(shown)
                .then((copied) => {
                  if (copied) toast.success("لینک کپی شد");
                  else toast.error("کپی لینک انجام نشد؛ مجوز کلیپ‌بورد را بررسی کنید");
                })
                .catch(() => toast.error("کپی لینک انجام نشد"));
            }}
            className="press type-footnote mt-3 w-full rounded-xl px-3 py-3 text-ios-label-secondary"
          >
            کپی لینک این آهنگ
          </button>

          <Link
            to="/explore"
            className="press type-subheadline mt-6 flex items-center justify-center gap-2 py-2 text-ios-label-secondary"
          >
            <Search className="size-4" strokeWidth={2} />
            جستجوی آهنگ‌های دیگر
          </Link>
        </motion.div>
      </div>
    </AppShell>
  );
}

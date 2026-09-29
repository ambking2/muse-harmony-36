import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Play, Pause, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Artwork } from "@/components/music/Artwork";
import { decodeTrackShareKey } from "@/lib/share-link";
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

  useEffect(() => {
    if (resolved) playTrack(resolved, [resolved]);
    // Only auto-plays on arrival; re-running on every store update would
    // restart the track.
  }, [resolved, playTrack]);

  const shown = libraryTrack ?? resolved;

  if (!resolved) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-black">این لینک معتبر نیست</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            بخشی از لینک کپی نشده یا تغییر کرده است. لطفاً دوباره از دکمه‌ی اشتراک استفاده کنید.
          </p>
          <Link
            to="/explore"
            className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            رفتن به جستجو
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!shown) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            به اشتراک گذاشته شده
          </p>

          <div className="mt-4 overflow-hidden rounded-3xl shadow-2xl shadow-black/60">
            <Artwork
              track={shown}
              size={600}
              className="aspect-square w-full"
              rounded="rounded-3xl"
            />
          </div>

          <h1 className="mt-6 text-balance text-3xl font-black tracking-tight">{shown.name}</h1>
          {shown.artist.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
              {shown.artist.map((a) => (
                <Link
                  key={a}
                  to="/artist/$name"
                  params={{ name: a }}
                  className="text-base text-muted-foreground transition hover:text-primary"
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
              className="mt-1 block truncate text-sm text-muted-foreground/70 transition hover:text-primary"
            >
              {shown.album}
            </Link>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => (isCurrent ? togglePlay() : playTrack(shown, [shown]))}
              className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition active:scale-95"
              aria-label={isCurrent && isPlaying ? "توقف" : "پخش"}
            >
              {isCurrent && isPlaying ? <Pause className="size-7" /> : <Play className="size-7" />}
            </button>
            <button
              onClick={() => navigate({ to: "/now-playing" })}
              className="glass flex-1 rounded-full py-3.5 text-sm font-semibold transition hover:bg-white/10"
            >
              صفحه‌ی پخش
            </button>
          </div>

          <button
            onClick={() => {
              void navigator.clipboard
                ?.writeText(window.location.href)
                .then(() => toast.success("لینک کپی شد"))
                .catch(() => toast.error("کپی نشد"));
            }}
            className="mt-3 w-full rounded-full py-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            کپی لینک این آهنگ
          </button>

          <Link
            to="/explore"
            className="mt-6 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <Search className="size-4" />
            جستجوی آهنگ‌های دیگر
            <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </motion.div>
      </div>
    </AppShell>
  );
}

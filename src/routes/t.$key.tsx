import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link2 as LinkIcon, Loader2, Play, Pause, Search, Copy, Music2 } from "lucide-react";
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
      <div className="relative isolate min-h-[calc(100dvh-var(--chrome-inset))] overflow-hidden">
        {shown.picUrl && (
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <img
              src={shown.picUrl}
              alt=""
              aria-hidden="true"
              className="size-full scale-110 object-cover opacity-20 blur-[90px]"
            />
            <div className="absolute inset-0 bg-background/75" />
          </div>
        )}
        <div className="mx-auto flex min-h-[calc(100dvh-var(--chrome-inset))] max-w-xl items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
          <motion.article
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-card/75 shadow-2xl shadow-black/20 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Music2 className="size-5" strokeWidth={2.2} />
                </span>
                <span className="text-base font-bold tracking-tight">muis</span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground">
                آهنگ به اشتراک گذاشته‌شده
              </span>
            </div>

            <div className="px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
              <div className="mx-auto w-full max-w-[min(68vw,300px)] sm:max-w-[320px]">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-[2rem] bg-primary/10 blur-2xl" />
                  <Artwork
                    track={shown}
                    size={640}
                    className="relative aspect-square w-full rounded-[1.5rem] shadow-xl shadow-black/25 ring-1 ring-white/10"
                    rounded="rounded-[1.5rem]"
                  />
                </div>
              </div>

              <div className="mx-auto mt-7 max-w-md text-center">
                <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  {shown.name}
                </h1>
                {shown.artist.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
                    {shown.artist.map((a) => (
                      <Link
                        key={a}
                        to="/artist/$name"
                        params={{ name: a }}
                        className="text-base text-primary transition-opacity hover:opacity-80"
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
                    className="mt-1.5 inline-block max-w-full truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {shown.album}
                  </Link>
                )}
              </div>

              <div className="mx-auto mt-7 grid max-w-md grid-cols-[1fr_1.35fr] gap-3">
                <button
                  type="button"
                  onClick={() => (isCurrent ? togglePlay() : playTrack(shown, [shown]))}
                  className="press inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform"
                  aria-label={isCurrent && isPlaying ? "توقف" : "پخش"}
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="size-5 fill-current" strokeWidth={0} />
                  ) : (
                    <Play className="size-5 translate-x-px fill-current" strokeWidth={0} />
                  )}
                  {isCurrent && isPlaying ? "در حال پخش" : "پخش آهنگ"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/now-playing" })}
                  className="press inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 font-medium transition-colors hover:bg-white/[0.08]"
                >
                  صفحه‌ی پخش
                  <span aria-hidden="true" className="text-muted-foreground">↗</span>
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
                className="press mx-auto mt-3 flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                <Copy className="size-4" strokeWidth={1.8} />
                کپی لینک این آهنگ
              </button>
            </div>

            <div className="border-t border-white/10 px-5 py-4 sm:px-7">
              <Link
                to="/explore"
                className="press flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="size-4" strokeWidth={2} />
                کشف و جستجوی آهنگ‌های دیگر
              </Link>
            </div>
          </motion.article>
        </div>
      </div>
    </AppShell>
  );
}

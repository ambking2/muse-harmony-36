import { forwardRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Heart,
  Home,
  Library,
  Pause,
  Play,
  Search,
  User,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Dock } from "@/components/ui/dock-two";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { getPicUrl, picKey } from "@/lib/gdmusic";
import { trackKey } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Draws a lucide glyph thinner than its 2px default, so a row of five reads
 *  as a quiet bar instead of a strip of app icons. */
const thin = (Icon: LucideIcon): LucideIcon =>
  forwardRef<SVGSVGElement, LucideProps>((props, ref) => (
    <Icon {...props} ref={ref} strokeWidth={1.5} />
  ));

/** The primitive hard-codes `text-foreground` on the glyph itself, so a colour
 *  set on the button would just be inherited and then overridden. Targeting
 *  the child svg keeps the specificity on our side and needs no edit to the
 *  primitive. With no fill behind the icons, this is the only thing marking
 *  the current page. */
const state = (active: boolean) => (active ? "[&_svg]:text-primary" : "");

/**
 * The app's bottom navigation, plus a slim now-playing bar sitting directly on
 * top of it.
 *
 * The two live in one `w-fit` column so the bar stretches to exactly the tray's
 * width — the tray sizes itself to its icons, and the bar is `w-full` inside
 * the same box, so they can never drift apart at any breakpoint.
 */
export function DockNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const go = (to: string) => () => void navigate({ to });

  const items: Array<{
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    className: string;
  }> = [
    { label: "خانه", icon: thin(Home), onClick: go("/"), className: state(isActive("/")) },
    {
      label: "جستجو",
      icon: thin(Search),
      onClick: go("/explore"),
      className: state(isActive("/explore")),
    },
    {
      label: "کتابخانه",
      icon: thin(Library),
      onClick: go("/library"),
      className: state(isActive("/library")),
    },
    {
      label: "علاقه‌مندی",
      icon: thin(Heart),
      onClick: go("/favorites"),
      className: state(isActive("/favorites")),
    },
    {
      label: "پروفایل",
      icon: thin(User),
      onClick: go("/profile"),
      className: state(isActive("/profile")),
    },
  ];

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="pointer-events-auto flex w-fit flex-col items-center gap-2">
        <NowPlayingBar />
        {/* The primitive ships a 256px-tall demo frame; collapse it to the tray. */}
        <Dock items={items} className="h-auto w-auto p-0" />
      </div>
    </nav>
  );
}

/**
 * A one-line version of the old mini player: the track, a play/pause, and a
 * tap target into the full screen. Same tray treatment and same thin glyphs
 * as the dock, so the pair reads as a single object rather than two floating
 * panels.
 */
function NowPlayingBar() {
  const track = usePlayer((s) => s.queue[s.index]);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isBuffering = usePlayer((s) => s.isBuffering);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);

  const key = track ? trackKey(track) : "";
  const isFav = !!key && favorites.includes(key);

  const pic = useQuery({
    queryKey: picKey(track?.source ?? "", track?.pic_id ?? "", 96),
    enabled: !!track && !track.picUrl,
    staleTime: 30 * 60_000,
    queryFn: () => getPicUrl(track!.source, track!.pic_id, 96),
  });

  return (
    <AnimatePresence>
      {track ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full"
        >
          <div className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-background/90 p-2 backdrop-blur-lg">
            <Link
              to="/now-playing"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="در حال پخش"
            >
              <span
                className={cn(
                  "relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted",
                  isBuffering && "animate-pulse",
                )}
              >
                {track.picUrl || pic.data ? (
                  <img
                    src={track.picUrl ?? pic.data ?? ""}
                    alt=""
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="skeleton block size-full" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-right">
                <span className="block truncate text-[13px] font-semibold leading-tight">
                  {track.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {track.artist.join("، ")}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => toggleFavorite(track)}
              aria-label="علاقه‌مندی"
              aria-pressed={isFav}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground",
                isFav && "text-primary",
              )}
            >
              <Heart className={cn("size-4", isFav && "fill-current")} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => togglePlay()}
              aria-label={isPlaying ? "توقف" : "پخش"}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition active:scale-95"
            >
              {isPlaying ? (
                <Pause className="size-4" strokeWidth={1.5} />
              ) : (
                <Play className="size-4 translate-x-px" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

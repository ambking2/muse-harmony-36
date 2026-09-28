import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, ListMusic, Shuffle, Trash2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePlayer } from "@/stores/player";
import { useLibrary } from "@/stores/library";
import { trackKey } from "@/lib/types";
import { Artwork } from "../music/Artwork";
import { cn } from "@/lib/utils";
import { queueRegistry } from "@/lib/ui-control";
import type { Track } from "@/lib/types";

/**
 * The playback queue was previously write-only: tracks could be added but
 * there was no way to see or reorder them. This is that view.
 */
export function QueueSheet() {
  const [open, setOpen] = useState(false);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const shuffle = usePlayer((s) => s.shuffle);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const moveInQueue = usePlayer((s) => s.moveInQueue);
  const clearQueue = usePlayer((s) => s.clearQueue);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFav = useLibrary((s) => s.toggleFavorite);

  // The top bar opens this without prop drilling.
  useEffect(() => queueRegistry.register({ open: () => setOpen(true) }), []);

  const upcoming = queue.slice(index + 1);
  const played = queue.slice(0, index);
  const current = queue[index];

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerContent className="max-h-[78vh] border-white/10 bg-card/95 backdrop-blur-2xl">
        <DrawerTitle className="flex items-center justify-between px-5 text-base">
          <span className="flex items-center gap-2">
            <ListMusic className="size-4 text-primary" />
            صف پخش
            <span className="text-xs font-normal text-muted-foreground ltr-nums">
              {queue.length}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <IconBtn onClick={toggleShuffle} active={shuffle} label="تصادفی">
              <Shuffle className="size-4" />
            </IconBtn>
            <IconBtn onClick={clearQueue} label="پاک کردن صف">
              <Trash2 className="size-4" />
            </IconBtn>
            <IconBtn onClick={() => setOpen(false)} label="بستن">
              <X className="size-4" />
            </IconBtn>
          </div>
        </DrawerTitle>

        <div className="mt-3 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {queue.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              صف خالی است. از صفحه‌ی جستجو آهنگی را به صف اضافه کنید.
            </p>
          )}

          {current && (
            <section className="mb-4">
              <SectionLabel>در حال پخش</SectionLabel>
              <QueueItem
                track={current}
                active
                playing={isPlaying}
                onPlay={() => togglePlay()}
                onRemove={() => removeFromQueue(index)}
                isFavorite={favorites.includes(trackKey(current))}
                onFavorite={() => toggleFav(current)}
              />
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="mb-4">
              <SectionLabel>در راه</SectionLabel>
              <DraggableList
                items={upcoming}
                offset={index + 1}
                onMove={(from, to) => moveInQueue(from + index + 1, to + index + 1)}
                onPlay={(i) => playQueue(queue, i)}
                onRemove={(i) => removeFromQueue(i + index + 1)}
                favorites={favorites}
                onFavorite={toggleFav}
              />
            </section>
          )}

          {played.length > 0 && (
            <section>
              <SectionLabel>پخش‌شده</SectionLabel>
              <DraggableList
                items={played}
                offset={0}
                onMove={(from, to) => moveInQueue(from, to)}
                onPlay={(i) => playQueue(queue, i)}
                onRemove={(i) => removeFromQueue(i)}
                favorites={favorites}
                onFavorite={toggleFav}
                muted
              />
            </section>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground",
        active && "bg-primary/20 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function QueueItem({
  track,
  active,
  playing,
  muted,
  isFavorite,
  onPlay,
  onRemove,
  onFavorite,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEndProp,
  draggable,
}: {
  track: Track;
  active?: boolean;
  playing?: boolean;
  muted?: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onFavorite: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEndProp?: () => void;
  draggable?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEndProp}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
        active ? "bg-white/5" : "hover:bg-white/5",
        muted && "opacity-50",
      )}
    >
      {draggable && (
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/60" />
      )}
      <button onClick={onPlay} className="relative shrink-0" aria-label="پخش">
        <Artwork track={track} size={100} className="size-11" rounded="rounded-lg" />
        {active && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/50">
            <Equalizer playing={!!playing} />
          </div>
        )}
      </button>
      <button onClick={onPlay} className="min-w-0 flex-1 text-right">
        <div className={cn("truncate text-sm font-medium", active && "text-primary")}>
          {track.name}
        </div>
        <div className="truncate text-xs text-muted-foreground">{track.artist.join("، ")}</div>
      </button>
      <IconBtn onClick={onFavorite} label="علاقه‌مندی" active={isFavorite}>
        <HeartIcon filled={isFavorite} />
      </IconBtn>
      <IconBtn onClick={onRemove} label="حذف از صف">
        <X className="size-4" />
      </IconBtn>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", filled && "fill-current text-primary")}
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
      aria-hidden
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

/** Three animated bars — the standard "this one is playing" affordance. */
export function Equalizer({ playing = true }: { playing?: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-white"
          animate={playing ? { height: ["30%", "100%", "50%"] } : { height: "30%" }}
          transition={{
            duration: 0.7 + i * 0.15,
            repeat: playing ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function DraggableList({
  items,
  offset,
  onMove,
  onPlay,
  onRemove,
  favorites,
  onFavorite,
  muted,
}: {
  items: Track[];
  offset: number;
  onMove: (from: number, to: number) => void;
  onPlay: (i: number) => void;
  onRemove: (i: number) => void;
  favorites: string[];
  onFavorite: (t: Track) => void;
  muted?: boolean;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);

  return (
    <AnimatePresence initial={false}>
      {items.map((t, i) => {
        const absolute = offset + i;
        return (
          <motion.div
            key={`${trackKey(t)}-${absolute}`}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
          >
            <QueueItem
              track={t}
              muted={muted}
              isFavorite={favorites.includes(trackKey(t))}
              onPlay={() => onPlay(absolute)}
              onRemove={() => onRemove(absolute)}
              onFavorite={() => onFavorite(t)}
              draggable={!muted}
              onDragStart={() => setFrom(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setTo(i);
              }}
              onDrop={() => {
                if (from !== null && to !== null && from !== to) onMove(from, to);
                setFrom(null);
                setTo(null);
              }}
              onDragEndProp={() => {
                setFrom(null);
                setTo(null);
              }}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

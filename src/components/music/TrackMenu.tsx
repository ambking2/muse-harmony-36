import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Quality, Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import {
  Download,
  Heart,
  ListPlus,
  Plus,
  Share2,
  Trash2,
  ListMusic,
  Mic2,
  Disc3,
} from "lucide-react";
import { downloadTrack } from "@/lib/download";
import { shareTrack } from "@/lib/share-link";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { QUALITIES } from "@/lib/gdmusic";
import { cn } from "@/lib/utils";

export function TrackMenu({ track, playlistId, children }: { track: Track; playlistId?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const addToQueue = usePlayer((s) => s.addToQueue);
  const playNext = usePlayer((s) => s.playNext);
  const addToLibrary = useLibrary((s) => s.addToLibrary);
  const removeFromLibrary = useLibrary((s) => s.removeFromLibrary);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const toggleFav = useLibrary((s) => s.toggleFavorite);
  const favorites = useLibrary((s) => s.favorites);
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const library = useLibrary((s) => s.library);

  const k = trackKey(track);
  const inLibrary = library.some((x) => trackKey(x) === k);
  const isFav = favorites.includes(k);

  const share = async () => {
    if (await shareTrack(track)) toast.success("لینک کپی شد");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="max-w-[15rem] truncate text-xs font-normal text-muted-foreground">
          {track.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => playNext(track)}>
          <ListPlus className="ml-2 size-4" /> پخش بعدی
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => addToQueue(track)}>
          <ListMusic className="ml-2 size-4" /> افزودن به صف
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleFav(track)}>
          <Heart className={cn("ml-2 size-4", isFav && "fill-current text-primary")} />
          {isFav ? "حذف از علاقه‌مندی" : "علاقه‌مندی"}
        </DropdownMenuItem>
        {playlistId && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              removeFromPlaylist(playlistId, k);
              toast.success("آهنگ از این پلی‌لیست حذف شد");
            }}
          >
            <Trash2 className="ml-2 size-4" /> حذف از این پلی‌لیست
          </DropdownMenuItem>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus className="ml-2 size-4" /> افزودن به پلی‌لیست
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() => {
                const name = window.prompt("نام پلی‌لیست؟");
                if (!name) return;
                const p = createPlaylist(name);
                addToPlaylist(p.id, track);
                toast.success(`به «${p.name}» اضافه شد`);
              }}
            >
              <Plus className="ml-2 size-4" /> پلی‌لیست جدید
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator />}
            {playlists.map((p) => {
              const already = p.trackKeys.includes(k);
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => {
                    if (already) {
                      removeFromPlaylist(p.id, k);
                      toast.success(`از «${p.name}» حذف شد`);
                    } else {
                      addToPlaylist(p.id, track);
                      toast.success(`به «${p.name}» اضافه شد`);
                    }
                  }}
                >
                  {already ? (
                    <Trash2 className="ml-2 size-4 text-destructive" />
                  ) : (
                    <Plus className="ml-2 size-4" />
                  )}
                  <span className="truncate">{already ? `حذف از ${p.name}` : p.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem
          onSelect={() => {
            if (inLibrary) {
              removeFromLibrary(k);
            } else {
              addToLibrary(track);
              toast.success("به کتابخانه اضافه شد");
            }
          }}
        >
          {inLibrary ? (
            <>
              <Trash2 className="ml-2 size-4" /> حذف از کتابخانه
            </>
          ) : (
            <>
              <Plus className="ml-2 size-4" /> افزودن به کتابخانه
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="ml-2 size-4" /> دانلود
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {QUALITIES.map((q) => (
              <DropdownMenuItem
                key={q.br}
                onSelect={() => void downloadTrack(track, q.br as Quality)}
              >
                {q.br === 999 ? "FLAC" : `${q.br} kbps`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {track.artist[0] && (
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/artist/$name", params: { name: track.artist[0] } })}
          >
            <Mic2 className="ml-2 size-4" /> صفحه‌ی خواننده
          </DropdownMenuItem>
        )}
        {track.album && (
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/album/$name", params: { name: track.album } })}
          >
            <Disc3 className="ml-2 size-4" /> صفحه‌ی آلبوم
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void share()}>
          <Share2 className="ml-2 size-4" /> اشتراک‌گذاری
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

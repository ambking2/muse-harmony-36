import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Track } from "@/lib/types";
import { trackKey } from "@/lib/types";
import { useLibrary } from "@/stores/library";
import { usePlayer } from "@/stores/player";
import { Download, Heart, ListPlus, Plus, Share2, Trash2, ListMusic } from "lucide-react";
import { downloadTrack } from "@/lib/download";
import { toast } from "sonner";

export function TrackMenu({ track, children }: { track: Track; children: ReactNode }) {
  const addToQueue = usePlayer((s) => s.addToQueue);
  const playNext = usePlayer((s) => s.playNext);
  const addToLibrary = useLibrary((s) => s.addToLibrary);
  const removeFromLibrary = useLibrary((s) => s.removeFromLibrary);
  const toggleFav = useLibrary((s) => s.toggleFavorite);
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const library = useLibrary((s) => s.library);

  const k = trackKey(track);
  const inLibrary = library.some((x) => trackKey(x) === k);

  const share = async () => {
    const url = window.location.origin + `/?q=${encodeURIComponent(track.name + " " + track.artist.join(" "))}`;
    try {
      if (navigator.share) await navigator.share({ title: track.name, text: track.artist.join(", "), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-56">
        <DropdownMenuItem onSelect={() => playNext(track)}>
          <ListPlus className="mr-2 size-4" /> Play next
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => addToQueue(track)}>
          <ListMusic className="mr-2 size-4" /> Add to queue
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleFav(track)}>
          <Heart className="mr-2 size-4" /> Toggle favorite
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus className="mr-2 size-4" /> Add to playlist
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass-strong">
            <DropdownMenuItem
              onSelect={() => {
                const name = window.prompt("Playlist name?");
                if (!name) return;
                const p = createPlaylist(name);
                addToPlaylist(p.id, track);
                toast.success(`Added to "${p.name}"`);
              }}
            >
              <Plus className="mr-2 size-4" /> New playlist
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator />}
            {playlists.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => {
                  addToPlaylist(p.id, track);
                  toast.success(`Added to "${p.name}"`);
                }}
              >
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onSelect={() =>
            inLibrary ? removeFromLibrary(k) : (addToLibrary(track), toast.success("Added to Library"))
          }
        >
          {inLibrary ? (
            <><Trash2 className="mr-2 size-4" /> Remove from Library</>
          ) : (
            <><Plus className="mr-2 size-4" /> Add to Library</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="mr-2 size-4" /> Download
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass-strong">
            {[128, 320, 999].map((br) => (
              <DropdownMenuItem key={br} onSelect={() => downloadTrack(track, br as 128 | 320 | 999)}>
                {br === 999 ? "FLAC" : `${br} kbps`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={share}>
          <Share2 className="mr-2 size-4" /> Share
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchTracks } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";
import { Music, Search } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const playTrack = usePlayer((s) => s.playTrack);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useQuery({
    queryKey: ["cmd-search", q],
    enabled: open && q.trim().length > 1,
    queryFn: () => searchTracks(q, { count: 8 }),
    staleTime: 60_000,
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search songs, artists, albums… (⌘K)" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q ? "No matches" : "Type to search"}</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => { setOpen(false); navigate({ to: "/" }); }}>
            <Search className="mr-2 size-4" /> Home
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); navigate({ to: "/explore" }); }}>
            <Search className="mr-2 size-4" /> Explore
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); navigate({ to: "/library" }); }}>
            <Search className="mr-2 size-4" /> Library
          </CommandItem>
        </CommandGroup>
        {results.data && results.data.length > 0 && (
          <CommandGroup heading="Songs">
            {results.data.map((t) => (
              <CommandItem
                key={`${t.source}:${t.id}`}
                onSelect={() => {
                  playTrack(t, results.data!);
                  setOpen(false);
                  navigate({ to: "/now-playing" });
                }}
              >
                <Music className="mr-2 size-4" /> {t.name}
                <span className="ml-2 text-xs text-muted-foreground">{t.artist.join(", ")}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
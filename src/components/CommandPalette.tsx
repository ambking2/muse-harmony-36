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
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { searchSmart } from "@/lib/gdmusic";
import { usePlayer } from "@/stores/player";
import { paletteRegistry } from "@/lib/ui-control";
import {
  Disc3,
  Heart,
  Home,
  Library,
  ListMusic,
  Mic2,
  Music,
  Pause,
  Play,
  Search,
  Settings,
  SkipForward,
  User,
} from "lucide-react";

const PAGES = [
  { to: "/", label: "خانه", icon: Home },
  { to: "/explore", label: "جستجو و کشف", icon: Search },
  { to: "/library", label: "کتابخانه", icon: Library },
  { to: "/favorites", label: "علاقه‌مندی‌ها", icon: Heart },
  { to: "/downloads", label: "دانلودها", icon: Disc3 },
  { to: "/profile", label: "پروفایل", icon: User },
  { to: "/settings", label: "تنظیمات", icon: Settings },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const isPlaying = usePlayer((s) => s.isPlaying);

  useEffect(() => paletteRegistry.register({ open: () => setOpen(true) }), []);

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

  // Persian-aware: the query is translated to the Latin form the providers
  // index inside searchSmart, so no extra work is needed here.
  const results = useQuery({
    queryKey: ["cmd-search", q],
    enabled: open && q.trim().length > 1,
    queryFn: () => searchSmart(q, { count: 10 }),
    staleTime: 2 * 60_000,
  });

  const tracks = results.data ?? [];
  const artists = [...new Set(tracks.flatMap((t) => t.artist))].slice(0, 5);
  const albums = [...new Set(tracks.map((t) => t.album).filter(Boolean))].slice(0, 4);

  const go = (to: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: to as "/" });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="آهنگ، خواننده یا آلبوم…" value={q} onValueChange={setQ} />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>{q ? "نتیجه‌ای پیدا نشد" : "برای جستجو بنویسید"}</CommandEmpty>

        {tracks.length > 0 && (
          <>
            <CommandGroup heading="آهنگ‌ها">
              {tracks.map((t) => (
                <CommandItem
                  key={`${t.source}:${t.id}`}
                  value={`${t.name} ${t.artist.join(" ")}`}
                  onSelect={() => {
                    playTrack(t, tracks);
                    setOpen(false);
                    navigate({ to: "/now-playing" });
                  }}
                >
                  <Music className="mr-2 size-4" />
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto ps-3 text-xs text-muted-foreground">
                    {t.artist.join("، ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            {artists.length > 0 && (
              <CommandGroup heading="خواننده‌ها">
                {artists.map((a) => (
                  <CommandItem
                    key={a}
                    value={`artist ${a}`}
                    onSelect={() => go(`/artist/${encodeURIComponent(a)}`)}
                  >
                    <Mic2 className="mr-2 size-4" />
                    {a}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {albums.length > 0 && (
              <CommandGroup heading="آلبوم‌ها">
                {albums.map((a) => (
                  <CommandItem
                    key={a}
                    value={`album ${a}`}
                    onSelect={() => go(`/album/${encodeURIComponent(a)}`)}
                  >
                    <ListMusic className="mr-2 size-4" />
                    {a}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="پخش">
          <CommandItem
            onSelect={() => {
              togglePlay();
              setOpen(false);
            }}
          >
            {isPlaying ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            {isPlaying ? "توقف" : "پخش / ادامه"}
            <CommandShortcut className="ltr-nums">Space</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              next();
              setOpen(false);
            }}
          >
            <SkipForward className="mr-2 size-4" />
            آهنگ بعدی
            <CommandShortcut className="ltr-nums">⇧→</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="صفحه‌ها">
          {PAGES.map((p) => (
            <CommandItem key={p.to} value={`go ${p.label}`} onSelect={() => go(p.to)}>
              <p.icon className="mr-2 size-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

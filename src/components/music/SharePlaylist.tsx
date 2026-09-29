import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Globe, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";

import { playlistApi, useSession, type PlaylistSummary } from "@/lib/account";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/types";

/** Local playlist id -> id on the server, so republishing reuses one link. */
const MAP_KEY = "muis:shared";

function readMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  localStorage.setItem(MAP_KEY, JSON.stringify(map));
}

/**
 * Publishes a local playlist and hands back a link that works on any device.
 *
 * The local playlist is a row in this browser's localStorage, so its existing
 * share button produced a `/playlist/<local id>` URL that resolves to nothing
 * anywhere else. This creates a server-side copy holding a snapshot of the
 * tracks, and reuses it on every later share so the link does not rot.
 */
export function SharePlaylist({
  playlistId,
  name,
  tracks,
}: {
  playlistId: string;
  name: string;
  tracks: Track[];
}) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<PlaylistSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const signedIn = !!session?.username;
  const url = remote ? `${window.location.origin}/p/${remote.id}` : "";

  // Re-open on the existing link rather than publishing a second copy.
  useEffect(() => {
    if (!open || !signedIn) return;
    const existingId = readMap()[playlistId];
    if (!existingId) {
      setRemote(null);
      return;
    }
    void playlistApi
      .mine()
      .then(({ playlists }) => {
        const found = playlists.find((p) => p.id === existingId);
        if (found) setRemote(found);
        else {
          // The server copy is gone (deleted, or a fresh store). Forget it so
          // the next share publishes cleanly.
          const map = readMap();
          delete map[playlistId];
          writeMap(map);
        }
      })
      .catch(() => undefined);
  }, [open, signedIn, playlistId]);

  const publish = useMutation({
    mutationFn: (isPublic: boolean) => {
      const existingId = readMap()[playlistId];
      if (existingId) {
        return playlistApi.publish(existingId, { isPublic, name, tracks }).then(() =>
          playlistApi.mine().then(({ playlists }) => {
            const found = playlists.find((p) => p.id === existingId);
            if (!found) throw new Error("پلی‌لیست پیدا نشد");
            return found;
          }),
        );
      }
      return playlistApi.create(name, tracks, isPublic).then((r) => r.playlist);
    },
    onSuccess: (playlist) => {
      setRemote(playlist);
      writeMap({ ...readMap(), [playlistId]: playlist.id });
      void qc.invalidateQueries({ queryKey: ["shared-playlists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!signedIn) {
    return (
      <Link
        to="/account"
        className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
      >
        <Share2 className="size-4" /> اشتراک‌گذاری
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
      >
        <Share2 className="size-4" /> اشتراک‌گذاری
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="اشتراک‌گذاری پلی‌لیست"
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-3xl p-6"
          >
            <h2 className="text-lg font-black">اشتراک‌گذاری «{name}»</h2>

            {!remote ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  این پلی‌لیست روی این دستگاه ذخیره است. برای اینکه روی دستگاه دیگری هم باز شود، یک
                  نسخه روی سرور ساخته می‌شود.
                </p>
                <div className="mt-5 grid gap-2">
                  <button
                    onClick={() => publish.mutate(true)}
                    disabled={publish.isPending}
                    className="flex items-center gap-3 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Globe className="size-4" />
                    عمومی — هر کسی با لینک باز کند
                  </button>
                  <button
                    onClick={() => publish.mutate(false)}
                    disabled={publish.isPending}
                    className="glass flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-50"
                  >
                    <Lock className="size-4" />
                    خصوصی — فقط با لینک
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  لینک آماده است — روی هر دستگاهی باز می‌شود.
                </p>
                <div className="mt-4 flex gap-2">
                  <code
                    dir="ltr"
                    className="min-w-0 flex-1 truncate rounded-xl bg-muted px-3 py-2 text-xs"
                  >
                    {url}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "کپی شد" : "کپی"}
                  </button>
                </div>

                <div className="mt-5 flex gap-2">
                  {(
                    [
                      [true, "عمومی", Globe],
                      [false, "خصوصی", Lock],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={label}
                      onClick={() => publish.mutate(value)}
                      disabled={publish.isPending || remote.isPublic === value}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                        remote.isPublic === value
                          ? "bg-primary text-primary-foreground"
                          : "glass hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  حالت خصوصی یعنی لینک در فهرست عمومی نیست؛ کسی که لینک را نداشته باشد نمی‌تواند آن
                  را باز کند. این حساب ایمیل ندارد، پس لینک را گم نکنید.
                </p>
              </>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-2xl py-2.5 text-sm text-muted-foreground hover:text-foreground"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </>
  );
}

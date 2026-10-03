import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Imported through Vite so the content hash lands in the URL. Preloading the
// Arabic slice matters more than it looks: it is the face every word on screen
// uses, and without a preload the browser only discovers it after it has
// parsed the stylesheet and matched the glyphs — a full round trip of blank
// text on a cold cache. The Latin slice is left to load on its own; it is
// rarely needed and would only compete for bandwidth.
import vazirmatnArabic from "@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { GlassDefs } from "@/components/ios/GlassDefs";
import { useSession } from "@/lib/account";
import { initGlassMode } from "@/lib/glass";
import { initTheme } from "@/lib/theme";
import { useAccountLibrary } from "@/lib/library-sync";
import { AudioEngine } from "@/hooks/use-audio-engine";
import { useLibrary } from "@/stores/library";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">صفحه پیدا نشد</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          صفحه‌ای که دنبالش بودید وجود ندارد یا جابه‌جا شده است.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">این صفحه باز نشد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          مشکلی پیش آمد. می‌توانید دوباره تلاش کنید یا به خانه برگردید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            تلاش دوباره
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            خانه
          </a>
        </div>
      </div>
    </div>
  );
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0810" },
      { title: "muis — پخش‌کننده‌ی موسیقی فارسی" },
      {
        name: "description",
        content:
          "muis یک پخش‌کننده‌ی موسیقی فارسی‌محور با رابط شیشه‌ای، متن ترانه‌ی همگام، پخش آفلاین و صف هوشمند است.",
      },
      { name: "author", content: "muis" },
      { property: "og:locale", content: "fa_IR" },
      { property: "og:title", content: "muis — پخش‌کننده‌ی موسیقی فارسی" },
      {
        property: "og:description",
        content: "پخش، دانلود و سازماندهیی موسیقی‌های ایرانی و جهانی، هرجا که باشید.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: vazirmatnArabic,
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
    ],
    // Applies the saved glass preference before the first paint. Doing it in
    // an effect would paint one frame of the wrong appearance on every load.
    // Only the "off" case is written: no attribute means the default, which is
    // glass on — so the server-rendered HTML already matches the common case.
    scripts: [
      {
        children: `try{if(localStorage.getItem("muis-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
      },
      {
        children: `try{if(localStorage.getItem("muis-glass")==="off")document.documentElement.dataset.glass="off"}catch(e){}`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Playlists, favourites and history follow the account rather than the device,
 * so signing in brings them with it. Signed out, nothing happens and the
 * library stays where it was: on this machine.
 *
 * A component of its own because it reads the session, and the session is a
 * query — which needs the QueryClientProvider below it to already be mounted.
 */
function AccountLibrarySync() {
  const session = useSession();
  useAccountLibrary(session.data?.username ?? null);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const hydrateDownloads = useLibrary((s) => s.hydrateDownloads);

  // The inline head script has already put the saved glass mode on the root
  // element; this syncs the module store that the settings switch reads, so the
  // toggle never shows the wrong position on first paint.
  useEffect(initGlassMode, []);
  useEffect(initTheme, []);

  // Rebuild offline object URLs from IndexedDB once, on first paint.
  useEffect(() => {
    void hydrateDownloads();
  }, [hydrateDownloads]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* The refraction filter every glass surface points at. Mounted once. */}
      <GlassDefs />
      {/* Global audio engine — must live above the route outlet so playback persists across navigation. */}
      <AudioEngine />
      <AccountLibrarySync />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

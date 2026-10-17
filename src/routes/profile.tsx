import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Disc3,
  HardDrive,
  Heart,
  ListMusic,
  LogOut,
  Music,
  Search,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Reveal } from "@/components/ios/Reveal";
import { Row } from "@/components/ios/Row";
import { Screen } from "@/components/ios/Screen";
import { useLibrary } from "@/stores/library";
import { accountApi, useSession } from "@/lib/account";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes } from "@/lib/gdmusic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

/**
 * Profile.
 *
 * Four cards, each one a group of its own: the account at the top, then the
 * collection, then what you have done with it, then the way into the rest of
 * the app. The shape is the iOS settings screen read from the
 * top — a heading, a card, a gap — so each group says what it is before it
 * says what is in it.
 *
 * The groups stay separate on purpose. Welded into one panel they would be a
 * single object with four headings, and nothing would say which rows belong
 * together; separated, each card is one thing you could lift out on its own.
 * Inside a card, the rows run together with only a hairline between them,
 * because they are one list.
 */
function ProfilePage() {
  const library = useLibrary((state) => state.library);
  const favorites = useLibrary((state) => state.favorites);
  const playlists = useLibrary((state) => state.playlists);
  const downloads = useLibrary((state) => state.downloads);
  const history = useLibrary((state) => state.history);
  const favoriteArtists = useLibrary((state) => state.favoriteArtists);
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await accountApi.logout();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    } catch {
      // The session query remains the source of truth.
    }
  };

  const fa = (value: number) => value.toLocaleString("fa-IR");
  const offline = downloads.filter((item) => item.status === "done");
  const offlineSize = offline.reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <AppShell>
      <Screen title="حساب کاربری" subtitle="مدیریت حساب و موسیقی‌های شما">
        <div className="mx-auto w-full max-w-2xl space-y-5 pb-6">
          <Reveal index={0}>
            <section className="card overflow-hidden p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-full bg-ios-fill text-ios-tint ring-1 ring-black/5 dark:ring-white/10">
                  <UserRound className="size-8" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="type-footnote text-ios-label-secondary">حساب شما</p>
                  <p className="mt-1 truncate text-xl font-semibold tracking-tight" dir={session?.username ? "ltr" : "rtl"}>
                    {isPending ? "در حال بررسی…" : session?.username ?? "مهمان"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ios-label-secondary">
                    {session
                      ? "پلی‌لیست‌ها و علاقه‌مندی‌ها با حساب شما همگام می‌شوند"
                      : "برای همگام‌سازی پلی‌لیست‌ها و علاقه‌مندی‌ها وارد شوید"}
                  </p>
                </div>
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full text-ios-label-secondary transition-colors hover:bg-ios-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-tint" aria-label="گزینه‌های حساب">
                      <span className="flex gap-1" aria-hidden>
                        <span className="size-1 rounded-full bg-current" />
                        <span className="size-1 rounded-full bg-current" />
                        <span className="size-1 rounded-full bg-current" />
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48 rounded-2xl p-1.5">
                    <DropdownMenuItem asChild className="rounded-xl py-2.5">
                      <Link to="/account"><UserRound className="size-4" />حساب کاربری</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl py-2.5">
                      <Link to="/settings"><SettingsIcon className="size-4" />تنظیمات</Link>
                    </DropdownMenuItem>
                    {session && <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="rounded-xl py-2.5 text-red-500 focus:text-red-500" onSelect={() => void handleLogout()}>
                        <LogOut className="size-4" />خروج از حساب
                      </DropdownMenuItem>
                    </>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {!session && !isPending && (
                <Link to="/account" className="btn btn-filled mt-4 w-full justify-center">
                  ورود یا ساخت حساب
                </Link>
              )}
            </section>
          </Reveal>

          <Reveal index={1}>
            <section className="card overflow-hidden">
              <div className="px-5 pb-2 pt-5">
                <h2 className="type-title-3">موسیقی‌های من</h2>
                <p className="type-footnote mt-1 text-ios-label-secondary">مجموعه‌ها و محتوای ذخیره‌شده</p>
              </div>
              <div className="inset-divided">
                <Row plain icon={Music} tone="amber" label="کتابخانه‌ی من" detail="آهنگ‌های ذخیره‌شده" to="/library" value={fa(library.length)} />
                <Row plain icon={Heart} tone="rose" label="علاقه‌مندی‌ها" detail="آهنگ‌ها و خواننده‌های محبوب" to="/favorites" value={fa(favorites.length)} />
                <Row plain icon={ListMusic} tone="sky" label="پلی‌لیست‌ها" detail="مجموعه‌های موسیقی شما" to="/library" value={fa(playlists.length)} />
                <Row plain icon={HardDrive} tone="cyan" label="پخش آفلاین" detail={offlineSize > 0 ? formatBytes(offlineSize) : "آهنگ‌های آماده‌ی پخش بدون اینترنت"} to="/downloads" value={offline.length ? fa(offline.length) : undefined} />
                <Row plain icon={Search} tone="blue" label="جستجوی موسیقی" detail="پیداکردن آهنگ تازه" to="/explore" />
              </div>
            </section>
          </Reveal>

          <Reveal index={2}>
            <section className="card overflow-hidden">
              <div className="px-5 pb-2 pt-5">
                <h2 className="type-title-3">حساب و تنظیمات</h2>
                <p className="type-footnote mt-1 text-ios-label-secondary">اطلاعات و ترجیحات برنامه</p>
              </div>
              <div className="inset-divided">
                <Row plain icon={UserRound} tone="slate" label="اطلاعات حساب" detail={session ? "مدیریت حساب و پلی‌لیست‌های اشتراکی" : "ورود، ثبت‌نام یا بازیابی حساب"} to="/account" />
                <Row plain icon={SettingsIcon} tone="blue" label="تنظیمات برنامه" detail="ظاهر و رفتار پخش‌کننده" to="/settings" />
                <Row plain icon={Disc3} tone="violet" label="پلی‌لیست‌های اشتراکی" detail="مدیریت مجموعه‌های منتشرشده" to="/account" />
                {session && (
                  <div className="px-4 py-2">
                    <button type="button" onClick={() => void handleLogout()} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-right text-red-500 transition-colors hover:bg-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                      <LogOut className="size-5 shrink-0" strokeWidth={1.8} />
                      <span className="flex-1">خروج از حساب کاربری</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </Reveal>

          <p className="type-footnote px-4 text-center leading-6 text-ios-label-tertiary">
            {session ? "حساب شما برای همگام‌سازی پلی‌لیست‌ها و علاقه‌مندی‌ها استفاده می‌شود." : "بدون حساب هم می‌توانید موسیقی جستجو کنید و به کتابخانه‌ی خود دسترسی داشته باشید."}
          </p>
        </div>
      </Screen>
    </AppShell>
  );
}

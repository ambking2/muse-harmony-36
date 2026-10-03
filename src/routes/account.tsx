import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check, Copy, Globe, Link2, Lock, LogOut, Settings, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { Segmented } from "@/components/ios/Segmented";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { accountApi, playlistApi, useSession } from "@/lib/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "حساب کاربری — muis" }] }),
  component: AccountPage,
});

type Mode = "signin" | "signup" | "recover";

function AccountPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <AppShell>
        <Screen
          title="حساب کاربری"
          back={{ to: "/profile" }}
          actions={
            <Link
              to="/settings"
              className="btn btn-gray h-9 min-h-9 px-3 text-sm"
              aria-label="تنظیمات"
            >
              <Settings className="size-4" strokeWidth={2} />
              تنظیمات
            </Link>
          }
        >
          <p className="type-body py-16 text-center text-ios-label-secondary">در حال بررسی…</p>
        </Screen>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Screen title="حساب کاربری" back={{ to: "/profile" }}>
        <div className="pt-4">
          {session?.username ? <SignedIn username={session.username} /> : <SignedOut />}
        </div>
      </Screen>
    </AppShell>
  );
}

/* -------------------------------------------------------------- signed out */

function SignedOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  const after = async () => {
    await qc.invalidateQueries({ queryKey: ["session"] });
    await qc.invalidateQueries({ queryKey: ["shared-playlists"] });
  };

  const signIn = useMutation({
    mutationFn: () => accountApi.login(username, password),
    onSuccess: after,
    onError: (e: Error) => toast.error(e.message),
  });

  const signUp = useMutation({
    mutationFn: () => accountApi.register(username, password),
    onSuccess: async (r) => {
      // Shown once and never recoverable — there is no email to send them to.
      setCodes(r.recoveryCodes);
      await after();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recover = useMutation({
    mutationFn: () => accountApi.recover(username, code, password),
    onSuccess: () => {
      toast.success("رمز عوض شد. حالا با رمز تازه وارد شوید.");
      setMode("signin");
      setCode("");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = signIn.isPending || signUp.isPending || recover.isPending;

  if (codes) return <RecoveryCodes codes={codes} onDone={() => navigate({ to: "/library" })} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signin") signIn.mutate();
    else if (mode === "signup") signUp.mutate();
    else recover.mutate();
  };

  const field =
    "type-body min-h-11 w-full rounded-xl bg-ios-fill px-4 outline-none placeholder:text-ios-label-tertiary focus-visible:ring-2 focus-visible:ring-ios-tint disabled:opacity-50";
  const tabs: readonly { value: Mode; label: string }[] = [
    { value: "signin", label: "ورود" },
    { value: "signup", label: "ساخت حساب" },
    { value: "recover", label: "بازیابی" },
  ];

  return (
    <div className="mx-auto max-w-md">
      <p className="type-subheadline text-ios-label-secondary">
        برای همگام‌سازی پلی‌لیست‌ها بین دستگاه‌ها و اشتراک‌گذاری عمومی، حساب بسازید.
      </p>

      <Segmented
        className="mt-4"
        value={mode}
        onChange={(value) => setMode(value)}
        options={tabs}
      />

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          className={field}
          placeholder="نام کاربری"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          dir="ltr"
        />
        {mode === "recover" && (
          <input
            className={field}
            placeholder="کد بازیابی (مثل ABCDE-12345)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
          />
        )}
        <input
          className={field}
          type="password"
          placeholder={mode === "recover" ? "رمز تازه" : "رمز"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
        <button type="submit" disabled={busy} className="btn btn-filled w-full">
          {busy ? "لطفاً صبر کنید…" : tabs.find((t) => t.value === mode)?.label}
        </button>
      </form>

      {mode === "signup" && (
        <p className="type-footnote panel mt-4 p-4 leading-relaxed text-ios-label-secondary">
          این حساب ایمیل ندارد. اگر رمز را فراموش کنید، تنها راه بازگشت یکی از کدهای بازیابی است که
          در پایان ثبت‌نام نشان داده می‌شود. آن‌ها را جایی امن نگه دارید — هر کد فقط یک بار کار
          می‌کند.
        </p>
      )}
      {mode === "recover" && (
        <p className="type-footnote panel mt-4 p-4 leading-relaxed text-ios-label-secondary">
          با هر بازیابی، همه‌ی کدهای بازیابی باطل و همه‌ی نشست‌های فعال بسته می‌شوند.
        </p>
      )}

      <p className="type-footnote mt-6 text-center text-ios-label-secondary">
        بدون حساب هم می‌توانید{" "}
        <Link to="/explore" className="text-ios-tint underline">
          جستجو کنید
        </Link>
        .
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- signed in */

function SignedIn({ username }: { username: string }) {
  const qc = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["shared-playlists"],
    queryFn: playlistApi.mine,
  });

  const logout = useMutation({
    mutationFn: () => accountApi.logout(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session"] });
      await qc.invalidateQueries({ queryKey: ["shared-playlists"] });
    },
  });

  const setVisibility = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      playlistApi.publish(id, { isPublic }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shared-playlists"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const unshare = useMutation({
    mutationFn: (id: string) => playlistApi.remove(id),
    onSuccess: () => {
      toast.success("پلی‌لیست از سرور حذف شد");
      void qc.invalidateQueries({ queryKey: ["shared-playlists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const playlists = data?.playlists ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Section>
        <div className="card flex flex-wrap items-center gap-4 p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-tile bg-ios-tint text-white">
            <UserRound className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-footnote text-ios-label-secondary">وارد شده‌اید به‌عنوان</p>
            <p className="type-title-3 truncate" dir="ltr">
              {username}
            </p>
          </div>

          <AlertDialog onOpenChange={setLeaving}>
            <AlertDialogTrigger asChild>
              <button type="button" className="btn btn-gray">
                <LogOut className="size-4" strokeWidth={2} />
                خروج
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="material-thick max-w-sm gap-4 rounded-sheet border-ios-separator p-5">
              <AlertDialogHeader className="space-y-1 text-right">
                <AlertDialogTitle className="type-title-3">خروج از حساب؟</AlertDialogTitle>
                <AlertDialogDescription className="type-subheadline">
                  پلی‌لیست‌های اشتراکی‌تان روی سرور می‌مانند و بعداً با همین حساب برمی‌گردند.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start">
                <AlertDialogCancel className="btn btn-gray flex-1">انصراف</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="btn btn-filled flex-1"
                >
                  بله، خارج شو
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>

      <Section
        title="پلی‌لیست‌های اشتراکی"
        footer={
          playlists.length
            ? "لینک هرکدام روی هر دستگاهی باز می‌شود."
            : "هنوز چیزی منتشر نکرده‌اید — از صفحه‌ی هر پلی‌لیست، دکمه‌ی «اشتراک‌گذاری» را بزنید."
        }
      >
        {playlists.length === 0 ? (
          <p className="type-subheadline px-4 py-6 text-center text-ios-label-secondary">
            هنوز پلی‌لیستی منتشر نکرده‌اید.
          </p>
        ) : (
          playlists.map((p) => (
            <SharedRow
              key={p.id}
              id={p.id}
              name={p.name}
              count={p.count}
              isPublic={p.isPublic}
              busy={setVisibility.isPending || unshare.isPending}
              onToggle={() => setVisibility.mutate({ id: p.id, isPublic: !p.isPublic })}
              onUnshare={() => {
                if (confirm(`«${p.name}» از سرور حذف شود؟ لینک آن از کار می‌افتد.`)) {
                  unshare.mutate(p.id);
                }
              }}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function SharedRow({
  id,
  name,
  count,
  isPublic,
  busy,
  onToggle,
  onUnshare,
}: {
  id: string;
  name: string;
  count: number;
  isPublic: boolean;
  busy: boolean;
  onToggle: () => void;
  onUnshare: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/p/${id}`;

  return (
    <div className="panel flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="type-body truncate">{name}</p>
        <p className="type-footnote flex items-center gap-1 text-ios-label-secondary">
          {count.toLocaleString("fa-IR")} آهنگ ·
          {isPublic ? (
            <span className="inline-flex items-center gap-1 text-ios-tint">
              <Globe className="size-3" /> عمومی
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> خصوصی
            </span>
          )}
        </p>
      </div>

      <Link to="/p/$id" params={{ id }} className="btn btn-gray h-9 min-h-9 px-3">
        باز کردن
      </Link>

      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        aria-label="کپی لینک"
        className="press grid size-9 place-items-center rounded-lg bg-ios-fill text-ios-label-secondary"
      >
        {copied ? <Check className="size-4 text-ios-tint" /> : <Link2 className="size-4" />}
      </button>

      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={isPublic ? "کردن خصوصی" : "کردن عمومی"}
        className="press grid size-9 place-items-center rounded-lg bg-ios-fill text-ios-label-secondary disabled:opacity-50"
      >
        {isPublic ? <Lock className="size-4" /> : <Globe className="size-4" />}
      </button>

      <button
        type="button"
        onClick={onUnshare}
        disabled={busy}
        aria-label="حذف از سرور"
        className="press grid size-9 place-items-center rounded-lg bg-ios-fill text-ios-red disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/* --------------------------------------------------------- recovery codes */

/** Shown once, straight after signup. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="panel p-5">
        <h1 className="type-title-3 flex items-center gap-2">
          <Check className="size-5 text-ios-tint" strokeWidth={2.2} />
          کدهای بازیابی شما
        </h1>
        <p className="type-subheadline mt-2 leading-relaxed text-ios-label-secondary">
          حساب شما ایمیل ندارد، پس این کدها تنها راه بازگشت‌اند. همین حالا ذخیره‌شان کنید — دوباره
          نشان داده نمی‌شوند و هر کد فقط یک بار مصرف می‌شود.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 font-mono text-body" dir="ltr">
          {codes.map((code) => (
            <li key={code} className="rounded-xl bg-ios-fill px-3 py-2 text-center">
              {code}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(codes.join("\n"));
            setCopied(true);
          }}
          className="btn btn-gray mt-5 w-full"
        >
          <Copy className={cn("size-4", copied && "text-ios-tint")} strokeWidth={2} />
          {copied ? "کپی شد" : "کپی همه"}
        </button>

        <label className="type-subheadline mt-4 flex cursor-pointer items-start gap-3 text-ios-label-secondary">
          <input
            type="checkbox"
            checked={saved}
            onChange={(event) => setSaved(event.target.checked)}
            className="mt-0.5 size-5 accent-[var(--color-ios-tint)]"
          />
          کدها را جایی امن ذخیره کردم
        </label>
      </div>

      {/* Not merely a "continue" link: leaving before confirming the codes is
          the one way to lose the account for good. */}
      <button type="button" onClick={onDone} disabled={!saved} className="btn btn-filled w-full">
        ادامه به کتابخانه
      </button>
    </div>
  );
}

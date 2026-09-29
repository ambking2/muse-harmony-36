import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  Globe,
  Link2,
  Lock,
  LogIn,
  LogOut,
  ShieldAlert,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell, BackLink } from "@/components/layout/AppShell";
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
        <p className="py-16 text-center text-muted-foreground">در حال بررسی…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <BackLink />
        {session?.username ? <SignedIn username={session.username} /> : <SignedOut />}
      </div>
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
    "w-full rounded-full border border-input bg-background px-5 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";
  const tabs: { id: Mode; label: string; icon: typeof LogIn }[] = [
    { id: "signin", label: "ورود", icon: LogIn },
    { id: "signup", label: "ساخت حساب", icon: UserPlus },
    { id: "recover", label: "رمز را فراموش کرده‌ام", icon: ShieldAlert },
  ];

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-black tracking-tight">حساب کاربری</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        برای همگام‌سازی پلی‌لیست‌ها بین دستگاه‌ها و اشتراک‌گذاری عمومی، حساب بسازید.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-muted p-1 text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            aria-pressed={mode === t.id}
            className={cn(
              "rounded-full px-2 py-2 font-medium transition-colors",
              mode === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <t.icon className="mx-auto mb-1 size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
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
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "لطفاً صبر کنید…" : tabs.find((t) => t.id === mode)?.label}
        </button>
      </form>

      {mode === "signup" && (
        <p className="mt-4 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          این حساب ایمیل ندارد. اگر رمز را فراموش کنید، تنها راه بازگشت یکی از کدهای بازیابی است که
          در پایان ثبت‌نام نشان داده می‌شود. آن‌ها را جایی امن نگه دارید — هر کد فقط یک بار کار
          می‌کند.
        </p>
      )}
      {mode === "recover" && (
        <p className="mt-4 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          با هر بازیابی، همه‌ی کدهای بازیابی باطل و همه‌ی نشست‌های فعال بسته می‌شوند.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        بدون حساب هم می‌توانید{" "}
        <Link to="/explore" className="text-primary underline">
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="glass flex flex-wrap items-center gap-4 rounded-3xl p-6">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <UserRound className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">وارد شده‌اید به‌عنوان</p>
          <h1 className="truncate text-2xl font-black tracking-tight" dir="ltr">
            {username}
          </h1>
        </div>
        <button
          onClick={() => setLeaving(true)}
          className="flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          <LogOut className="size-4" />
          خروج
        </button>
      </div>

      <section>
        <h2 className="text-lg font-black">پلی‌لیست‌های اشتراکی</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {playlists.length
            ? "لینک هرکدام روی هر دستگاهی باز می‌شود."
            : "هنوز چیزی منتشر نکرده‌اید — از صفحه‌ی هر پلی‌لیست، دکمه‌ی «اشتراک‌گذاری» را بزنید."}
        </p>

        {playlists.length > 0 && (
          <ul className="mt-4 space-y-2">
            {playlists.map((p) => (
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
            ))}
          </ul>
        )}
      </section>

      {leaving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLeaving(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="خروج از حساب"
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-sm rounded-3xl p-6"
          >
            <h2 className="text-lg font-black">خروج از حساب؟</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              پلی‌لیست‌های اشتراکی‌تان روی سرور می‌مانند و بعداً با همین حساب برمی‌گردند.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                بله، خارج شو
              </button>
              <button
                onClick={() => setLeaving(false)}
                className="flex-1 rounded-full border border-input px-4 py-2.5 text-sm font-medium"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
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
    <li className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {count.toLocaleString("fa-IR")} آهنگ ·{" "}
          {isPublic ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Globe className="size-3" /> عمومی
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> خصوصی
            </span>
          )}
        </p>
      </div>

      <Link
        to="/p/$id"
        params={{ id }}
        className="rounded-full border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        باز کردن
      </Link>

      <button
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        aria-label="کپی لینک"
        className="rounded-full border border-input p-2 transition hover:bg-accent"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
      </button>

      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={isPublic ? "کردن خصوصی" : "کردن عمومی"}
        className="rounded-full border border-input p-2 transition hover:bg-accent disabled:opacity-50"
      >
        {isPublic ? <Lock className="size-4" /> : <Globe className="size-4" />}
      </button>

      <button
        onClick={onUnshare}
        disabled={busy}
        aria-label="حذف از سرور"
        className="rounded-full border border-destructive/40 p-2 text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

/* --------------------------------------------------------- recovery codes */

/** Shown once, straight after signup. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="glass rounded-3xl p-6">
        <h1 className="flex items-center gap-2 text-xl font-black">
          <Check className="size-5 text-primary" />
          کدهای بازیابی شما
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          حساب شما ایمیل ندارد، پس این کدها تنها راه بازگشت‌اند. همین حالا ذخیره‌شان کنید — دوباره
          نشان داده نمی‌شوند و هر کد فقط یک بار مصرف می‌شود.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 font-mono text-sm" dir="ltr">
          {codes.map((c) => (
            <li key={c} className="rounded-xl bg-muted px-3 py-2 text-center tracking-wider">
              {c}
            </li>
          ))}
        </ul>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(codes.join("\n"));
            setCopied(true);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          <Copy className={cn("size-4", copied && "text-primary")} />
          {copied ? "کپی شد" : "کپی همه"}
        </button>

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5"
          />
          کدها را جایی امن ذخیره کردم
        </label>
      </div>

      {/* Not merely a "continue" link: leaving before confirming the codes is
          the one way to lose the account for good. */}
      <button
        onClick={onDone}
        disabled={!saved}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
      >
        ادامه به کتابخانه
      </button>
    </div>
  );
}

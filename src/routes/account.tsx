import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check, Copy, LogIn, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell, BackLink } from "@/components/layout/AppShell";
import { accountApi, useSession } from "@/lib/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "حساب کاربری — muis" }] }),
  component: AccountPage,
});

type Mode = "signin" | "signup" | "recover";

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  const after = async () => {
    await qc.invalidateQueries({ queryKey: ["session"] });
    await qc.invalidateQueries({ queryKey: ["shared-playlists"] });
    navigate({ to: "/library" });
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

  if (codes) return <RecoveryCodes codes={codes} />;

  if (session?.username) {
    return (
      <AppShell>
        <div className="space-y-6">
          <BackLink />
          <div className="glass rounded-3xl p-8 text-center">
            <p className="text-sm text-muted-foreground">وارد شده‌اید به‌عنوان</p>
            <p className="mt-2 text-3xl font-black text-primary">{session.username}</p>
            {!session.durable && (
              <p className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
                این محیط ذخیره‌سازی پایدار ندارد؛ حساب‌ها با هر ری‌استارت از بین می‌روند.
              </p>
            )}
            <button
              onClick={async () => {
                await accountApi.logout();
                await after();
              }}
              className="mt-6 rounded-full border border-input px-5 py-2 text-sm font-medium hover:bg-accent"
            >
              خروج
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signin") signIn.mutate();
    else if (mode === "signup") signUp.mutate();
    else recover.mutate();
  };

  const field =
    "w-full rounded-full border border-input bg-background px-5 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const tabs: { id: Mode; label: string; icon: typeof LogIn }[] = [
    { id: "signin", label: "ورود", icon: LogIn },
    { id: "signup", label: "ساخت حساب", icon: UserPlus },
    { id: "recover", label: "رمز را فراموش کرده‌ام", icon: ShieldAlert },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <BackLink />
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
              این حساب ایمیل ندارد. اگر رمز را فراموش کنید، تنها راه بازگشت یکی از کدهای بازیابی است
              که در پایان ثبت‌نام به شما نشان داده می‌شود. آن‌ها را جایی امن نگه دارید — هر کد فقط
              یک بار کار می‌کند.
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
      </div>
    </AppShell>
  );
}

/** Shown once, straight after signup. */
function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  return (
    <AppShell>
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
        </div>
        <Link
          to="/library"
          className="block w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          ادامه به کتابخانه
        </Link>
      </div>
    </AppShell>
  );
}

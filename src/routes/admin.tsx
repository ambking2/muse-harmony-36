import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ShieldCheck, Users, ListMusic, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { useSession } from "@/lib/account";

type AdminData = {
  stats: { users: number; playlists: number; publicPlaylists: number; tracks: number };
  users: Array<{ username: string; createdAt: number; disabled: boolean }>;
  playlists: Array<{ id: string; owner: string; name: string; isPublic: boolean; updatedAt: number; count: number }>;
};

async function loadAdmin(): Promise<AdminData> {
  const response = await fetch("/api/admin", { credentials: "include" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "دریافت اطلاعات مدیریت ناموفق بود");
  return data;
}

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "مدیریت — muis" }] }),
  component: AdminPage,
});

function AdminPage() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["admin"], queryFn: loadAdmin, enabled: session.data?.username === "amb" });
  const act = async (url: string, method: string, body?: unknown) => {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "عملیات ناموفق بود");
    await query.refetch();
  };

  if (session.isPending) return <AppShell><Screen title="مدیریت"><p className="p-8 text-center">در حال بررسی نشست…</p></Screen></AppShell>;
  if (session.data?.username !== "amb") return <AppShell><Screen title="دسترسی محدود"><div className="mx-auto max-w-md py-16 text-center"><ShieldCheck className="mx-auto size-12 text-ios-label-tertiary"/><h2 className="type-title-2 mt-4">دسترسی مدیر لازم است</h2><p className="type-subheadline mt-2 text-ios-label-secondary">برای ورود به این بخش باید با حساب مدیر وارد شوید.</p></div></Screen></AppShell>;

  const users = query.data?.users.filter(user => user.username.includes(search.trim().toLowerCase())) ?? [];
  return <AppShell><Screen title="مدیریت muis" back={{ to: "/settings" }} actions={<button className="btn btn-gray h-9 min-h-9 px-3" onClick={() => void query.refetch()}><RefreshCw className="size-4"/> بروزرسانی</button>}>
    {query.isPending ? <p className="py-16 text-center text-ios-label-secondary">در حال دریافت اطلاعات…</p> : query.isError ? <div className="panel p-4 text-center"><p>{(query.error as Error).message}</p><button className="btn btn-gray mt-3" onClick={() => void query.refetch()}>تلاش دوباره</button></div> : query.data && <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Users/>} label="کاربران" value={query.data.stats.users}/>
        <Stat icon={<ListMusic/>} label="پلی‌لیست‌ها" value={query.data.stats.playlists}/>
        <Stat icon={<ShieldCheck/>} label="پلی‌لیست عمومی" value={query.data.stats.publicPlaylists}/>
        <Stat icon={<ListMusic/>} label="مجموع آهنگ‌ها" value={query.data.stats.tracks}/>
      </div>
      <Section title="مدیریت کاربران">
        <input className="type-body mb-3 min-h-11 w-full rounded-xl bg-ios-fill px-4 outline-none" placeholder="جستجوی نام کاربری…" value={search} onChange={e => setSearch(e.target.value)} dir="ltr"/>
        {users.length ? users.map(user => <div key={user.username} className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium" dir="ltr">{user.username}</p><p className="type-footnote text-ios-label-secondary">{new Date(user.createdAt).toLocaleDateString("fa-IR")} · <span className={user.disabled ? "text-ios-red" : "text-ios-green"}>{user.disabled ? "تعلیق‌شده" : "فعال"}</span></p></div>{user.username !== "amb" && <div className="flex gap-2"><button className="btn btn-gray h-9 min-h-9 px-3" onClick={() => void act("/api/admin?username="+encodeURIComponent(user.username), "PATCH", { disabled: !user.disabled }).catch(e => alert(e.message))}>{user.disabled ? "رفع تعلیق" : "تعلیق"}</button><button className="btn btn-gray h-9 min-h-9 px-3 text-ios-red" onClick={() => { if (confirm("حساب "+user.username+" و کتابخانه و پلی‌لیست‌هایش برای همیشه حذف شود؟")) void act("/api/admin?username="+encodeURIComponent(user.username), "DELETE").catch(e => alert(e.message)); }}>حذف</button></div>}</div>) : <p className="py-6 text-center text-ios-label-secondary">کاربری پیدا نشد.</p>}
      </Section>
      <Section title="مدیریت پلی‌لیست‌ها">
        {query.data.playlists.length ? query.data.playlists.map(p => <div key={p.id} className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="type-footnote text-ios-label-secondary"><span dir="ltr">{p.owner}</span> · {p.count.toLocaleString("fa-IR")} آهنگ · {p.isPublic ? "عمومی" : "خصوصی"}</p></div><div className="flex gap-2"><a className="btn btn-gray h-9 min-h-9 px-3" href={"/p/" + p.id}>مشاهده</a><button className="btn btn-gray h-9 min-h-9 px-3" onClick={() => void act("/api/admin?id="+encodeURIComponent(p.id), "PATCH", { isPublic: !p.isPublic }).catch(e => alert(e.message))}>{p.isPublic ? "خصوصی‌کردن" : "عمومی‌کردن"}</button><button className="btn btn-gray h-9 min-h-9 px-3 text-ios-red" onClick={() => { if (confirm("پلی‌لیست «"+p.name+"» حذف شود؟")) void act("/api/admin?id="+encodeURIComponent(p.id), "DELETE").catch(e => alert(e.message)); }}>حذف</button></div></div>) : <p className="py-6 text-center text-ios-label-secondary">پلی‌لیستی برای نمایش وجود ندارد.</p>}
      </Section>
    </>}
  </Screen></AppShell>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="panel p-4"><div className="flex items-center gap-2 text-ios-label-secondary">{icon}<span className="type-footnote">{label}</span></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("fa-IR")}</p></div>;
}

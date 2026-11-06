import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Database, Download, Eye, EyeOff, LayoutDashboard, ListMusic, Music2, RefreshCw, Search, ShieldCheck, Trash2, UserX, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { Section } from "@/components/ios/Section";
import { useSession } from "@/lib/account";
import type { FeaturedPlaylist } from "@/lib/featured";

type AdminData = {
  stats: { users: number; disabledUsers: number; playlists: number; publicPlaylists: number; tracks: number };
  storage: string; generatedAt: number;
  featuredPlaylists: FeaturedPlaylist[];
  users: Array<{ username: string; createdAt: number; disabled: boolean; playlistCount: number }>;
  playlists: Array<{ id: string; owner: string; name: string; isPublic: boolean; updatedAt: number; count: number }>;
};
type Tab = "overview" | "users" | "playlists" | "featured";
async function loadAdmin(): Promise<AdminData> {
  const response = await fetch("/api/admin", { credentials: "include" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "دریافت اطلاعات مدیریت ناموفق بود");
  return data;
}
export const Route = createFileRoute("/admin")({ head: () => ({ meta: [{ title: "مدیریت — muis" }] }), component: AdminPage });

function AdminPage() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "active" | "disabled">("all");
  const [playlistFilter, setPlaylistFilter] = useState<"all" | "public" | "private">("all");
  const [featuredDrafts, setFeaturedDrafts] = useState<Record<string, Partial<FeaturedPlaylist>>>({});
  const [newFeatured, setNewFeatured] = useState({ id: "", title: "", query: "", blurb: "", emoji: "🎵", group: "ایرانی" as "ایرانی" | "سبک" | "بین‌المللی" });
  const query = useQuery({ queryKey: ["admin"], queryFn: loadAdmin, enabled: session.data?.username === "amb", refetchInterval: 60000 });
  const act = async (url: string, method: string, body?: unknown) => {
    const response = await fetch(url, { method, credentials: "include", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "عملیات ناموفق بود");
    await query.refetch();
  };
  const users = useMemo(() => (query.data?.users ?? []).filter(u => u.username.toLowerCase().includes(userSearch.trim().toLowerCase()) && (userFilter === "all" || (userFilter === "disabled" ? u.disabled : !u.disabled))), [query.data, userSearch, userFilter]);
  const playlists = useMemo(() => (query.data?.playlists ?? []).filter(p => (p.name + " " + p.owner + " " + p.id).toLowerCase().includes(playlistSearch.trim().toLowerCase()) && (playlistFilter === "all" || (playlistFilter === "public" ? p.isPublic : !p.isPublic))).sort((a,b) => b.updatedAt-a.updatedAt), [query.data, playlistSearch, playlistFilter]);
  const exportCsv = (kind: "users" | "playlists") => {
    const rows = kind === "users" ? [["username","created_at","status"], ...(query.data?.users ?? []).map(u => [u.username,new Date(u.createdAt).toISOString(),u.disabled?"suspended":"active"])] : [["id","name","owner","visibility","tracks","updated_at"], ...(query.data?.playlists ?? []).map(p => [p.id,p.name,p.owner,p.isPublic?"public":"private",String(p.count),new Date(p.updatedAt).toISOString()])];
    const csv = "\uFEFF" + rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"','""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download=`muis-${kind}-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  if (session.isPending) return <AppShell><Screen title="مدیریت"><p className="p-8 text-center">در حال بررسی نشست…</p></Screen></AppShell>;
  if (session.data?.username !== "amb") return <AppShell><Screen title="دسترسی محدود"><div className="mx-auto max-w-md py-16 text-center"><ShieldCheck className="mx-auto size-12 text-ios-label-tertiary"/><h2 className="type-title-2 mt-4">دسترسی مدیر لازم است</h2><p className="type-subheadline mt-2 text-ios-label-secondary">برای ورود به این بخش باید با حساب مدیر وارد شوید.</p></div></Screen></AppShell>;
  return <AppShell><Screen title="مرکز مدیریت muis" back={{to:"/settings"}} actions={<button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>void query.refetch()} disabled={query.isFetching}><RefreshCw className={`size-4 ${query.isFetching?"animate-spin":""}`}/> بروزرسانی</button>}>
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl border border-ios-separator bg-ios-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="type-footnote text-ios-label-secondary">پنل کنترل و نظارت</p><h2 className="type-title-2 mt-1">سلام، مدیر 👋</h2><p className="type-footnote mt-1 text-ios-label-secondary">وضعیت کاربران، محتوای عمومی و سلامت داده‌ها</p></div><div className="rounded-2xl bg-ios-fill p-3"><ShieldCheck className="size-7"/></div></div>{query.data && <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ios-label-secondary"><span className="inline-flex items-center gap-1 rounded-full bg-ios-fill px-2.5 py-1"><Activity className="size-3"/> بروزرسانی خودکار هر ۶۰ ثانیه</span><span className="rounded-full bg-ios-fill px-2.5 py-1">آخرین دریافت: {new Date(query.data.generatedAt).toLocaleTimeString("fa-IR")}</span></div>}</div>
      {query.isPending ? <p className="py-16 text-center text-ios-label-secondary">در حال دریافت اطلاعات…</p> : query.isError ? <div className="panel p-5 text-center"><AlertTriangle className="mx-auto size-8 text-ios-red"/><p className="mt-3">{(query.error as Error).message}</p><button className="btn btn-gray mt-3" onClick={()=>void query.refetch()}>تلاش دوباره</button></div> : query.data && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat icon={<Users/>} label="کل کاربران" value={query.data.stats.users}/><Stat icon={<UserX/>} label="تعلیق‌شده" value={query.data.stats.disabledUsers}/><Stat icon={<ListMusic/>} label="پلی‌لیست‌ها" value={query.data.stats.playlists}/><Stat icon={<Music2/>} label="مجموع آهنگ‌ها" value={query.data.stats.tracks}/></div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ios-fill p-1 sm:grid-cols-4"><TabButton active={tab==="overview"} onClick={()=>setTab("overview")} icon={<LayoutDashboard/>} label="نمای کلی"/><TabButton active={tab==="users"} onClick={()=>setTab("users")} icon={<Users/>} label="کاربران"/><TabButton active={tab==="playlists"} onClick={()=>setTab("playlists")} icon={<ListMusic/>} label="پلی‌لیست‌ها"/><TabButton active={tab==="featured"} onClick={()=>setTab("featured")} icon={<Music2/>} label="محتوای سایت"/></div>
        {tab==="overview" && <>
          <Section title="نمای کلی سایت"><div className="grid grid-cols-2 gap-3"><MiniStat label="پلی‌لیست عمومی" value={query.data.stats.publicPlaylists.toLocaleString("fa-IR")} detail="قابل مشاهده برای همه"/><MiniStat label="پلی‌لیست خصوصی" value={(query.data.stats.playlists-query.data.stats.publicPlaylists).toLocaleString("fa-IR")} detail="فقط برای مالک"/><MiniStat label="حساب فعال" value={(query.data.stats.users-query.data.stats.disabledUsers).toLocaleString("fa-IR")} detail="امکان ورود دارند"/><MiniStat label="حساب مسدود" value={query.data.stats.disabledUsers.toLocaleString("fa-IR")} detail="نشست‌ها باطل شده"/></div></Section>
          <Section title="سلامت ذخیره‌سازی"><div className="panel flex items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><Database className="size-5 text-ios-label-secondary"/><div><p className="font-medium">مخزن داده حساب‌ها</p><p className="type-footnote text-ios-label-secondary">ذخیره کاربران، نشست‌ها و پلی‌لیست‌ها</p></div></div><span className="rounded-full bg-ios-fill px-3 py-1 text-sm">{query.data.storage==="d1"?"Cloudflare D1":query.data.storage==="kv"?"Cloudflare KV":query.data.storage}</span></div><p className="type-footnote mt-2 text-ios-label-secondary">این شاخص فقط backend حساب‌ها را گزارش می‌کند، نه سلامت موتور جستجو یا پخش موسیقی.</p></Section>
          <Section title="دسترسی سریع"><QuickAction label="مدیریت کاربران" detail="جستجو، تعلیق و حذف حساب‌ها" icon={<Users/>} onClick={()=>setTab("users")}/><QuickAction label="مدیریت پلی‌لیست‌ها" detail="تغییر سطح دسترسی و حذف محتوا" icon={<ListMusic/>} onClick={()=>setTab("playlists")}/><QuickAction label="خروجی کاربران CSV" detail="آرشیو اطلاعات حساب‌ها" icon={<Download/>} onClick={()=>exportCsv("users")}/></Section>
        </>}
        {tab==="users" && <Section title={`کاربران · ${users.length.toLocaleString("fa-IR")}`}><SearchInput value={userSearch} onChange={setUserSearch} placeholder="جستجوی نام کاربری…"/><FilterBar value={userFilter} onChange={setUserFilter} options={[["all","همه"],["active","فعال"],["disabled","تعلیق‌شده"]]}/><div className="mb-3 flex justify-end"><button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>exportCsv("users")}><Download className="size-4"/> خروجی CSV</button></div>
          {users.length?users.map(u=><div key={u.username} className="panel mb-2 flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium" dir="ltr">{u.username}</p><p className="type-footnote text-ios-label-secondary">عضویت: {new Date(u.createdAt).toLocaleDateString("fa-IR")} · {u.playlistCount.toLocaleString("fa-IR")} پلی‌لیست · <span className={u.disabled?"text-ios-red":"text-ios-green"}>{u.disabled?"تعلیق‌شده":"فعال"}</span></p></div>{u.username!=="amb"&&<div className="flex flex-wrap gap-2"><button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>{setPlaylistSearch(u.username);setPlaylistFilter("all");setTab("playlists");}}>پلی‌لیست‌ها</button><button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>void act("/api/admin?username="+encodeURIComponent(u.username),"PATCH",{disabled:!u.disabled}).catch(e=>alert(e.message))}>{u.disabled?<><CheckCircle2 className="size-4"/> رفع تعلیق</>:<><UserX className="size-4"/> تعلیق</>}</button><button className="btn btn-gray h-9 min-h-9 px-3 text-ios-red" onClick={()=>{if(confirm("حساب "+u.username+"، کتابخانه، نشست‌ها و پلی‌لیست‌هایش برای همیشه حذف شود؟"))void act("/api/admin?username="+encodeURIComponent(u.username),"DELETE").catch(e=>alert(e.message));}}><Trash2 className="size-4"/> حذف</button></div>}</div>):<Empty text="کاربری با این فیلتر پیدا نشد."/>}</Section>}
        {tab==="featured" && <Section title={`پلی‌لیست‌های رسمی سایت · ${query.data.featuredPlaylists.length.toLocaleString("fa-IR")}`}>
          <p className="type-footnote mb-3 text-ios-label-secondary">این‌ها مجموعه‌های خود muis هستند؛ تغییرات در ذخیره‌سازی سایت ثبت می‌شوند و در صفحه کشف و لینک اختصاصی هر مجموعه اعمال خواهند شد.</p>
          <div className="panel mb-4 space-y-3 p-4">
            <p className="font-semibold">ساخت پلی‌لیست رسمی جدید</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input className="min-h-10 rounded-xl bg-ios-fill px-3" placeholder="شناسه انگلیسی مثل ir-focus" value={newFeatured.id} onChange={e=>setNewFeatured(v=>({...v,id:e.target.value}))}/>
              <input className="min-h-10 rounded-xl bg-ios-fill px-3" placeholder="عنوان پلی‌لیست" value={newFeatured.title} onChange={e=>setNewFeatured(v=>({...v,title:e.target.value}))}/>
              <input className="min-h-10 rounded-xl bg-ios-fill px-3 sm:col-span-2" placeholder="عبارت جستجوی آهنگ‌ها" value={newFeatured.query} onChange={e=>setNewFeatured(v=>({...v,query:e.target.value}))}/>
              <input className="min-h-10 rounded-xl bg-ios-fill px-3" placeholder="توضیحات کوتاه" value={newFeatured.blurb} onChange={e=>setNewFeatured(v=>({...v,blurb:e.target.value}))}/>
              <div className="flex gap-2"><input className="min-h-10 w-20 rounded-xl bg-ios-fill px-3 text-center" value={newFeatured.emoji} onChange={e=>setNewFeatured(v=>({...v,emoji:e.target.value}))}/><select className="min-h-10 flex-1 rounded-xl bg-ios-fill px-3" value={newFeatured.group} onChange={e=>setNewFeatured(v=>({...v,group:e.target.value as typeof v.group}))}><option>ایرانی</option><option>سبک</option><option>بین‌المللی</option></select></div>
            </div>
            <button className="btn btn-filled w-full" onClick={()=>void act("/api/admin?featured=new","POST",newFeatured).then(()=>setNewFeatured({id:"",title:"",query:"",blurb:"",emoji:"🎵",group:"ایرانی"})).catch(e=>alert(e.message))}>ساخت مجموعه</button>
          </div>
          {query.data.featuredPlaylists.map(item=>{
            const draft={...item,...featuredDrafts[item.id]};
            const patch=(values:Partial<FeaturedPlaylist>)=>setFeaturedDrafts(old=>({...old,[item.id]:{...old[item.id],...values}}));
            return <div key={item.id} className="panel mb-3 space-y-3 p-4">
              <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="text-xl">{draft.emoji}</span><div className="min-w-0"><p className="truncate font-semibold">{draft.title}</p><p className="type-footnote text-ios-label-secondary" dir="ltr">/mix/{item.id}</p></div></div><label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled!==false} onChange={e=>patch({enabled:e.target.checked})}/> فعال</label></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className="min-h-10 rounded-xl bg-ios-fill px-3" aria-label="عنوان" value={draft.title} onChange={e=>patch({title:e.target.value})}/>
                <input className="min-h-10 rounded-xl bg-ios-fill px-3" aria-label="ایموجی" value={draft.emoji} onChange={e=>patch({emoji:e.target.value})}/>
                <input className="min-h-10 rounded-xl bg-ios-fill px-3 sm:col-span-2" aria-label="توضیحات" value={draft.blurb} onChange={e=>patch({blurb:e.target.value})}/>
                <input className="min-h-10 rounded-xl bg-ios-fill px-3 sm:col-span-2" aria-label="عبارت جستجو" value={draft.query??""} onChange={e=>patch({query:e.target.value})}/>
                <select className="min-h-10 rounded-xl bg-ios-fill px-3" value={draft.group} onChange={e=>patch({group:e.target.value as FeaturedPlaylist["group"]})}><option>ایرانی</option><option>سبک</option><option>بین‌المللی</option></select>
                <input className="min-h-10 rounded-xl bg-ios-fill px-3" aria-label="ترتیب نمایش" type="number" value={draft.sortOrder??0} onChange={e=>patch({sortOrder:Number(e.target.value)})}/>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-ios-separator pt-2"><a className="btn btn-gray h-9 min-h-9 px-3" href={"/mix/"+encodeURIComponent(item.id)} target="_blank" rel="noreferrer"><Eye className="size-4"/> باز کردن</a><div className="flex gap-2"><button className="btn btn-gray h-9 min-h-9 px-3 text-ios-red" onClick={()=>{if(confirm("مجموعه "+item.title+" از سایت حذف شود؟"))void act("/api/admin?featured="+encodeURIComponent(item.id),"DELETE").then(()=>setFeaturedDrafts(old=>{const n={...old};delete n[item.id];return n;})).catch(e=>alert(e.message));}}><Trash2 className="size-4"/> حذف</button><button className="btn btn-filled h-9 min-h-9 px-4" onClick={()=>void act("/api/admin?featured="+encodeURIComponent(item.id),"PATCH",draft).then(()=>setFeaturedDrafts(old=>{const n={...old};delete n[item.id];return n;})).catch(e=>alert(e.message))}>ذخیره تغییرات</button></div></div>
            </div>;
          })}
        </Section>}
        {tab==="playlists" && <Section title={`پلی‌لیست‌ها · ${playlists.length.toLocaleString("fa-IR")}`}><SearchInput value={playlistSearch} onChange={setPlaylistSearch} placeholder="نام، مالک یا شناسه پلی‌لیست…"/><FilterBar value={playlistFilter} onChange={setPlaylistFilter} options={[["all","همه"],["public","عمومی"],["private","خصوصی"]]}/><div className="mb-3 flex justify-end"><button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>exportCsv("playlists")}><Download className="size-4"/> خروجی CSV</button></div>
          {playlists.length?playlists.map(p=><div key={p.id} className="panel mb-2 space-y-3 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{p.name||"بدون عنوان"}</p><p className="type-footnote mt-1 text-ios-label-secondary"><span dir="ltr">{p.owner}</span> · {p.count.toLocaleString("fa-IR")} آهنگ</p><p className="type-footnote mt-1 break-all text-ios-label-tertiary" dir="ltr">{p.id}</p></div><span className="shrink-0 rounded-full bg-ios-fill px-2.5 py-1 text-xs">{p.isPublic?"عمومی":"خصوصی"}</span></div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-ios-separator pt-2"><span className="type-footnote text-ios-label-secondary">آخرین تغییر: {new Date(p.updatedAt).toLocaleDateString("fa-IR")}</span><div className="flex gap-2"><a className="btn btn-gray h-9 min-h-9 px-3" href={"/p/"+encodeURIComponent(p.id)}><Eye className="size-4"/> مشاهده</a><button className="btn btn-gray h-9 min-h-9 px-3" onClick={()=>void act("/api/admin?id="+encodeURIComponent(p.id),"PATCH",{isPublic:!p.isPublic}).catch(e=>alert(e.message))}>{p.isPublic?<><EyeOff className="size-4"/> خصوصی‌کردن</>:<><Eye className="size-4"/> عمومی‌کردن</>}</button><button className="btn btn-gray h-9 min-h-9 px-3 text-ios-red" onClick={()=>{if(confirm("پلی‌لیست «"+p.name+"» حذف شود؟ برگشت‌پذیر نیست."))void act("/api/admin?id="+encodeURIComponent(p.id),"DELETE").catch(e=>alert(e.message));}}><Trash2 className="size-4"/> حذف</button></div></div></div>):<Empty text="پلی‌لیستی با این فیلتر پیدا نشد."/>}</Section>}
      </>}
      <p className="type-footnote text-center text-ios-label-tertiary">muis Admin · فقط مدیر اصلی · اطلاعات محرمانه حساب‌ها نمایش داده نمی‌شود</p>
    </div>
  </Screen></AppShell>;
}
function Stat({icon,label,value}:{icon:ReactNode;label:string;value:number}){return <div className="panel p-4"><div className="flex items-center gap-2 text-ios-label-secondary">{icon}<span className="type-footnote">{label}</span></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("fa-IR")}</p></div>;}
function MiniStat({label,value,detail}:{label:string;value:string;detail:string}){return <div className="rounded-xl bg-ios-fill p-3"><p className="type-footnote text-ios-label-secondary">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="type-footnote mt-1 text-ios-label-tertiary">{detail}</p></div>;}
function TabButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:ReactNode;label:string}){return <button onClick={onClick} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm transition ${active?"bg-ios-card font-semibold shadow-sm":"text-ios-label-secondary"}`}>{icon}<span>{label}</span></button>;}
function FilterBar<T extends string>({value,onChange,options}:{value:T;onChange:(v:T)=>void;options:[T,string][]}){return <div className="mb-3 flex flex-wrap gap-2">{options.map(([key,label])=><button key={key} onClick={()=>onChange(key)} className={`rounded-full px-3 py-1.5 text-xs ${value===key?"bg-ios-label text-ios-bg":"bg-ios-fill text-ios-label-secondary"}`}>{label}</button>)}</div>;}
function SearchInput({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}){return <div className="relative mb-3"><Search className="absolute right-3 top-3 size-4 text-ios-label-tertiary"/><input className="type-body min-h-11 w-full rounded-xl bg-ios-fill py-2 pl-4 pr-10 outline-none" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>;}
function QuickAction({label,detail,icon,onClick}:{label:string;detail:string;icon:ReactNode;onClick:()=>void}){return <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-ios-separator py-3 text-right last:border-0"><span className="rounded-xl bg-ios-fill p-2">{icon}</span><span className="min-w-0 flex-1"><span className="block font-medium">{label}</span><span className="type-footnote text-ios-label-secondary">{detail}</span></span><ChevronRight className="size-4 text-ios-label-tertiary"/></button>;}
function Empty({text}:{text:string}){return <p className="py-8 text-center text-ios-label-secondary">{text}</p>;}

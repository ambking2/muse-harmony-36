import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowUpLeft, Check, Mail, MapPin, Phone } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * استودیو خام — a brutalist agency portfolio living at /studio.
 *
 * Deliberately standalone. It does not use AppShell, so the music player, its
 * dock and the app's dark purple theme are all untouched, and the route can be
 * deleted in one step. Everything visual is scoped to the custom properties
 * declared on <Shell> below, so nothing leaks into the rest of the app and
 * styles.css never had to change.
 *
 * Font note: the design system search recommends Archivo / Space Grotesk, but
 * neither ships Persian glyphs — they would silently fall back mid-sentence.
 * Vazirmatn is already loaded, covers both scripts, and reaches weight 900,
 * which is where the brutalist weight comes from anyway.
 */

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "استودیو خام — طراحی بی‌پرده" },
      {
        name: "description",
        content:
          "استودیو خام یک آژانس خلاق است: هویت بصری، طراحی محصول، موشن و کمپین برای برندهایی که از یکنواختی بیزارند.",
      },
    ],
  }),
  component: Studio,
});

/* ------------------------------------------------------------------ content */

const SERVICES = [
  "هویت بصری",
  "طراحی محصول",
  "موشن و انیمیشن",
  "کمپین تبلیغاتی",
  "بسته‌بندی",
  "ویدئو و فیلم کوتاه",
  "راهبرد برند",
  "رابط کاربری",
];

const WORK = [
  {
    n: "۰۱",
    title: "کافه‌ی نیمه‌شب",
    client: "قهوه‌خانه‌ی نیمه‌شب",
    tags: ["هویت بصری", "بسته‌بندی"],
    year: "۱۴۰۳",
    tone: "pink",
    blurb:
      "یک برند که شب کار می‌کند باید شب را هم طراحی کند. کل سیستم بصری روی کنتراست تند و تایپوگرافی درشت سوار شد.",
  },
  {
    n: "۰۲",
    title: "برچسب موج",
    client: "موج‌سرا",
    tags: ["نام‌گذاری", "بسته‌بندی"],
    year: "۱۴۰۳",
    tone: "cyan",
    blurb:
      "سه حرف، دو رنگ، بدون هیچ تصویری. بسته‌بندی عمداً بی‌تصویر ماند تا خود محصول تنها تصویر باشد.",
  },
  {
    n: "۰۳",
    title: "سینمای متحرک",
    client: "جشنواره‌ی فیلم کوتاه",
    tags: ["کمپین", "موشن"],
    year: "۱۴۰۲",
    tone: "ink",
    blurb: "پوستر متحرکی که در هر فریم خوانا ماند. هیچ ترنزیشنی بین دو عنوان نبود — فقط بریدن.",
  },
  {
    n: "۰۴",
    title: "کتابخانه‌ی آنلاین",
    client: "راهکو",
    tags: ["رابط کاربری", "سیستم طراحی"],
    year: "۱۴۰۲",
    tone: "yellow",
    blurb:
      "یک سیستم طراحی با ۱۱۲ جزء که تنها با سه متغیر تغییر می‌کند. تیم چهار نفره، شش ماه، بدون فایل استایل اضافه.",
  },
  {
    n: "۰۵",
    title: "فروشگاه زمین",
    client: "زمین‌خوار",
    tags: ["بسته‌بندی", "تصویرسازی"],
    year: "۱۴۰۱",
    tone: "cyan",
    blurb:
      "تصویرسازی به‌جای عکس، از خط و سطح ساخته شد تا تولید بسته‌بندی ارزان بماند و ظاهر گران به نظر برسد.",
  },
  {
    n: "۰۶",
    title: "آژانس سپید",
    client: "سپید",
    tags: ["وب‌سایت", "تجربه‌ی کاربری"],
    year: "۱۴۰۱",
    tone: "pink",
    blurb: "سایتی که در ۸۰ کیلوبایت جا شد و هر صفحه‌اش یک تصمیم بصری تازه دارد.",
  },
];

const TEAM = [
  { name: "نیلوفر احمدی", role: "مدیر خلاقیت", note: "۱۴ سال" },
  { name: "مهسا رستمی", role: "مدخل هنری", note: "نقاش" },
  { name: "کیان صادقی", role: "طراح ارشد", note: "۱۰ سال" },
  { name: "امید برزانی", role: "موشن دیزاینر", note: "فریم‌بورد" },
  { name: "هستی نوری", role: "استراتژی", note: "پژوهش" },
  { name: "سپهر ملکی", role: "توسعه‌ی فرانت‌اند", note: "دسترس‌پذیری" },
];

const STUDIO_EMAIL = "kham@studio.example";

/* ------------------------------------------------------------------- shared */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      style={
        {
          "--ink": "#12060f",
          "--paper": "#fdf2f8",
          "--pink": "#ec4899",
          "--cyan": "#0891b2",
          "--yellow": "#facc15",
        } as React.CSSProperties
      }
      className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] antialiased"
    >
      {children}
    </div>
  );
}

/** A block that snaps in when it enters the viewport. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const reduce = useReducedMotion();
  // Two identical halves; the track slides exactly one half so the seam is
  // never visible.
  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y-2 border-[var(--ink)] py-3 select-none">
      <motion.div
        className="flex w-max gap-8 whitespace-nowrap"
        animate={reduce ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-8 text-lg font-black tracking-tight">
            {item}
            <span aria-hidden="true" className="text-[var(--pink)]">
              ✳
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

function Studio() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3 });

  return (
    <Shell>
      {/* Progress: with reduced motion the bar is still drawn, just unsmoothed. */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: reduce ? scrollYProgress : bar }}
        className="fixed inset-x-0 top-0 z-50 h-1 origin-right bg-[var(--pink)]"
      />

      <header className="sticky top-0 z-40 border-b-2 border-[var(--ink)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-black tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pink)]"
          >
            <span aria-hidden="true" className="inline-block size-3 bg-[var(--pink)]" />
            خام
          </Link>
          <nav
            aria-label="ناوبری اصلی"
            className="hidden items-center gap-6 text-sm font-bold sm:flex"
          >
            <a href="#work" className="hover:text-[var(--pink)]">
              کارها
            </a>
            <a href="#team" className="hover:text-[var(--pink)]">
              تیم
            </a>
            <a href="#contact" className="hover:text-[var(--pink)]">
              تماس
            </a>
          </nav>
          <a
            href="#contact"
            className="border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-bold text-[var(--paper)] transition-none hover:bg-[var(--pink)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]"
          >
            شروع همکاری
          </a>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="border-b-2 border-[var(--ink)]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
            <Reveal>
              <p className="text-xs font-bold tracking-[0.3em] text-[var(--pink)]">
                آژانس خلاق — تهران
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-[clamp(2.75rem,11vw,8.5rem)] leading-[0.92] font-black tracking-tight">
                نرمی،
                <br />
                <span className="text-[var(--pink)]">دشمن</span> ماست.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-10 grid gap-8 md:grid-cols-12">
                <p className="text-lg leading-relaxed font-medium md:col-span-6 md:text-xl">
                  استودیو خام برای برندهایی کار می‌کند که از یکنواختی بیزارند. ما گوشه‌های تیز، تضاد
                  شدید و رنگ‌هایی می‌سازیم که در اسکرول گم نمی‌شوند.
                </p>
                <dl className="grid grid-cols-3 gap-px self-end border-2 border-[var(--ink)] bg-[var(--ink)] md:col-span-6">
                  {[
                    ["۱۲", "پروژه"],
                    ["۹", "سال"],
                    ["۴", "جایزه"],
                  ].map(([n, label]) => (
                    <div key={label} className="bg-[var(--paper)] p-4 text-center">
                      <dt className="sr-only">{label}</dt>
                      <dd className="text-3xl font-black text-[var(--pink)]">{n}</dd>
                      <p className="mt-1 text-xs font-bold">{label}</p>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        <Marquee items={SERVICES} />

        {/* ------------------------------------------------------------ work */}
        <section id="work" className="scroll-mt-20 border-b-2 border-[var(--ink)]">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <Reveal>
              <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-none font-black tracking-tight">
                کارهای <span className="text-[var(--pink)]">اخیر</span>
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-px border-2 border-[var(--ink)] bg-[var(--ink)] md:grid-cols-2">
              {WORK.map((item, i) => (
                <Reveal key={item.n} delay={(i % 2) * 0.06} className="bg-[var(--paper)]">
                  <article
                    className={cn(
                      "group relative flex h-full flex-col justify-between p-6 sm:p-8",
                      "transition-none hover:bg-[var(--ink)] hover:text-[var(--paper)]",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-4xl font-black text-[var(--pink)]">{item.n}</span>
                        <ArrowUpLeft
                          aria-hidden="true"
                          className="size-7 shrink-0 transition-none group-hover:-translate-x-1 group-hover:-translate-y-1"
                          strokeWidth={2.5}
                        />
                      </div>
                      <h3 className="mt-6 text-3xl leading-tight font-black tracking-tight sm:text-4xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm font-bold opacity-70">{item.client}</p>
                      <p className="mt-4 max-w-md leading-relaxed opacity-90">{item.blurb}</p>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="border-2 border-current px-2 py-0.5 text-xs font-bold"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="ms-auto text-sm font-black tabular-nums">{item.year}</span>
                    </div>
                    {/* Colour block stands in for artwork — no image request, and
                        the geometry is part of the composition. */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "mt-6 h-24 w-full border-2 border-current",
                        item.tone === "pink" && "bg-[var(--pink)]",
                        item.tone === "cyan" && "bg-[var(--cyan)]",
                        item.tone === "yellow" && "bg-[var(--yellow)]",
                        item.tone === "ink" && "bg-[var(--ink)]",
                      )}
                    />
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Marquee items={["بی‌پرده", "تند", "دقیق", "بی‌ادعا"]} reverse />

        {/* ------------------------------------------------------------ team */}
        <section id="team" className="scroll-mt-20 border-b-2 border-[var(--ink)]">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <Reveal>
              <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-none font-black tracking-tight">
                آدم‌های <span className="text-[var(--cyan)]">پشتش</span>
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed font-medium">
                شش نفر. بدون حساب. بدون جلسه‌ی بی‌فایده.
              </p>
            </Reveal>

            <ul className="mt-12 grid gap-px border-2 border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-2 lg:grid-cols-3">
              {TEAM.map((person, i) => (
                <Reveal key={person.name} delay={(i % 3) * 0.05} className="bg-[var(--paper)]">
                  <li className="group flex items-center gap-4 p-6 transition-none hover:bg-[var(--cyan)]">
                    {/* Initials rather than a photo: a portrait grid of grey
                        boxes would say nothing about the studio. */}
                    <span
                      aria-hidden="true"
                      className="grid size-14 shrink-0 place-items-center border-2 border-[var(--ink)] text-lg font-black"
                    >
                      {person.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black">{person.name}</span>
                      <span className="block text-sm font-bold opacity-75">{person.role}</span>
                    </span>
                    <span className="ms-auto self-start text-xs font-black opacity-60">
                      {person.note}
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------- contact */}
        <Contact />
      </main>

      <footer className="border-t-2 border-[var(--ink)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm font-bold">
          <p>استودیو خام — همه‌ی حقوق محفوظ است.</p>
          <Link to="/" className="flex items-center gap-2 hover:text-[var(--pink)]">
            <ArrowLeft aria-hidden="true" className="size-4" />
            بازگشت به موزیک
          </Link>
        </div>
      </footer>
    </Shell>
  );
}

/* ----------------------------------------------------------------- contact */

type Fields = { name: string; email: string; brief: string };
type FieldName = keyof Fields;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Fields = { name: "", email: "", brief: "" };

function validate(v: Fields): Errors {
  const errors: Errors = {};
  if (v.name.trim().length < 2) errors.name = "نام‌تان را بنویسید (دست‌کم ۲ حرف).";
  // Deliberately loose: the only real test of an address is sending to it.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()))
    errors.email = "نشانی ایمیل درست نیست.";
  if (v.brief.trim().length < 20) errors.brief = "کمی بیشتر توضیح بدهید — دست‌کم ۲۰ حرف.";
  return errors;
}

function Contact() {
  const reduce = useReducedMotion();
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);

  // Validation runs on every change, but a field only shows its error once it
  // has been blurred — or once a submit has happened.
  const errors = validate(values);
  const show = (f: FieldName) => (touched[f] || submitted ? errors[f] : undefined);
  const errorList = (Object.keys(errors) as FieldName[]).filter((f) => errors[f]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errorList.length > 0) {
      // Move focus to the summary, not the first field: a screen reader then
      // reads the whole problem list instead of dropping the user somewhere
      // in the middle of the form.
      summaryRef.current?.focus();
      return;
    }
    setSent(true);
  };

  const field =
    "w-full border-2 border-[var(--ink)] bg-transparent px-4 py-3 font-medium placeholder:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]";
  const label = "mb-2 block text-sm font-black";

  return (
    <section id="contact" className="scroll-mt-20">
      <div className="grid lg:grid-cols-2">
        <div className="border-b-2 border-[var(--ink)] p-8 sm:p-12 lg:border-b-0 lg:border-l-2">
          <Reveal>
            <h2 className="text-[clamp(2rem,6vw,4.5rem)] leading-none font-black tracking-tight">
              بیایید
              <br />
              حرف بزنیم
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed font-medium">
              پروژه‌ها را دست‌کم دو هفته جلوتر شروع می‌کنیم. اگر عجله دارید، شاید ما گزینه‌ی درستی
              نباشیم.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <ul className="mt-10 space-y-3 text-sm font-bold">
              <li>
                <a
                  href={`mailto:${STUDIO_EMAIL}`}
                  className="flex min-h-11 items-center gap-3 hover:text-[var(--pink)]"
                >
                  <Mail aria-hidden="true" className="size-5" strokeWidth={2.5} />
                  {STUDIO_EMAIL}
                </a>
              </li>
              <li className="flex min-h-11 items-center gap-3">
                <Phone aria-hidden="true" className="size-5" strokeWidth={2.5} />
                ۰۲۱ ۸۸۴۴ ۲۲۱۰
              </li>
              <li className="flex min-h-11 items-center gap-3">
                <MapPin aria-hidden="true" className="size-5" strokeWidth={2.5} />
                تهران، خیابان کارگر، پلاک ۱۴
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="p-8 sm:p-12">
          {sent ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col justify-center"
            >
              <span className="grid size-14 place-items-center border-2 border-[var(--ink)] bg-[var(--pink)]">
                <Check aria-hidden="true" className="size-7" strokeWidth={3} />
              </span>
              <h3 className="mt-6 text-3xl font-black tracking-tight">پیام‌تان ثبت شد</h3>
              <p className="mt-3 max-w-sm leading-relaxed font-medium">
                این نسخه بک‌اند ندارد و چیزی ذخیره نشده. برای فرستادن واقعی از دکمه‌ی زیر استفاده
                کنید یا مستقیم ایمیل بزنید.
              </p>
              <a
                href={`mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(
                  `پروژه از سایت — ${values.name}`,
                )}&body=${encodeURIComponent(values.brief)}`}
                className="mt-8 inline-flex min-h-12 w-fit items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-6 font-bold text-[var(--paper)] hover:bg-[var(--pink)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]"
              >
                فرستادن با ایمیل
                <ArrowLeft aria-hidden="true" className="size-4" />
              </a>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              {submitted && errorList.length > 0 && (
                <div
                  ref={summaryRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby={`${uid}-errtitle`}
                  className="mb-6 border-2 border-[var(--ink)] bg-[var(--yellow)] p-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <h3 id={`${uid}-errtitle`} className="font-black">
                    {errorList.length} مورد باید اصلاح شود
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {errorList.map((f) => (
                      <li key={f}>
                        <a href={`#${uid}-${f}`} className="underline underline-offset-2">
                          {errors[f]}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-5">
                {(
                  [
                    ["name", "نام شما", "مثلاً: سارا محمدی", "text"],
                    ["email", "ایمیل", "you@example.com", "email"],
                  ] as const
                ).map(([key, l, placeholder, type]) => (
                  <div key={key}>
                    <label htmlFor={`${uid}-${key}`} className={label}>
                      {l}
                    </label>
                    <input
                      id={`${uid}-${key}`}
                      name={key}
                      type={type}
                      value={values[key]}
                      placeholder={placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                      aria-invalid={show(key) ? true : undefined}
                      aria-describedby={show(key) ? `${uid}-${key}-err` : undefined}
                      className={cn(field, show(key) && "border-[var(--pink)] bg-[var(--pink)]/10")}
                    />
                    {show(key) && (
                      <p
                        id={`${uid}-${key}-err`}
                        className="mt-2 text-sm font-bold text-[var(--pink)]"
                      >
                        {show(key)}
                      </p>
                    )}
                  </div>
                ))}

                <div>
                  <label htmlFor={`${uid}-brief`} className={label}>
                    درباره‌ی پروژه
                  </label>
                  <textarea
                    id={`${uid}-brief`}
                    name="brief"
                    rows={5}
                    value={values.brief}
                    placeholder="چه چیزی می‌خواهید بسازید، برای چه کسی، و تا کی؟"
                    onChange={(e) => setValues((v) => ({ ...v, brief: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, brief: true }))}
                    aria-invalid={show("brief") ? true : undefined}
                    aria-describedby={show("brief") ? `${uid}-brief-err` : undefined}
                    className={cn(
                      field,
                      "resize-y",
                      show("brief") && "border-[var(--pink)] bg-[var(--pink)]/10",
                    )}
                  />
                  {show("brief") && (
                    <p
                      id={`${uid}-brief-err`}
                      className="mt-2 text-sm font-bold text-[var(--pink)]"
                    >
                      {show("brief")}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="mt-8 min-h-14 w-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 text-lg font-black text-[var(--paper)] transition-none hover:bg-[var(--pink)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]"
              >
                فرستادن
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

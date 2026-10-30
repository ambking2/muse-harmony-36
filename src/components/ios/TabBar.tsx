import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button as GlisseButton, TabBar as GlisseTabBar } from "glisse";
import type { ComponentPropsWithoutRef } from "react";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { cn } from "@/lib/utils";

type RouterAnchorProps = ComponentPropsWithoutRef<"a"> & { href: string };

/** Glisse supplies href; TanStack Router needs to receive it as to. */
function RouterAnchor({ href, ...props }: RouterAnchorProps) {
  return <Link to={href} {...props} />;
}

export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const current = tabForPath(pathname);

  const glassRing = cn(
    "material lens specular spotlight dock-hero pointer-events-auto relative isolate overflow-hidden",
    "border border-ios-separator shadow-[var(--floating-shadow)]",
  );

  return (
    <>
      {/* Original navigation is retained as the glass-off fallback. */}
      <nav
        aria-label="ناوبری اصلی"
        className="muis-legacy-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        <div className="pointer-events-auto flex w-full items-center justify-center gap-2.5 px-5">
          <div className={cn(glassRing, "flex w-[min(100%-3.75rem,19rem)] items-center justify-around rounded-[2.25rem] px-2 py-1.5")}>
            <span className="lens-bend" aria-hidden="true" />
            <span className="refract" aria-hidden="true" />
            {DOCK_ITEMS.map((item) => (
              <Link
                key={item.tab}
                to={item.to}
                aria-current={current === item.tab ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "press relative isolate flex min-h-12 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[1.75rem] px-3.5",
                  "transition-colors duration-200",
                  current === item.tab ? "text-ios-tint" : "text-ios-label-secondary",
                )}
              >
                <item.icon className="relative z-10 size-6" strokeWidth={current === item.tab ? 2.2 : 1.8} />
                <span className="type-caption relative z-10 leading-none" style={{ opacity: current === item.tab ? 1 : 0.72 }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
          <Link
            to={SEARCH_ITEM.to}
            aria-label={SEARCH_ITEM.label}
            className={cn(
              glassRing,
              "grid size-14 shrink-0 place-items-center rounded-full text-ios-label-secondary",
              "isolate overflow-hidden spotlight transition-colors duration-200 hover:text-ios-tint",
            )}
          >
            <span className="lens-bend" aria-hidden="true" />
            <span className="refract" aria-hidden="true" />
            <SEARCH_ITEM.icon className="size-6" strokeWidth={1.8} />
          </Link>
        </div>
      </nav>

      {/* The real Glisse Liquid Glass navigation, enabled by the glass setting. */}
      <nav
        aria-label="ناوبری اصلی"
        className="muis-glisse-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        <div className="muis-glisse-dock-inner pointer-events-auto flex w-full items-center justify-center gap-2.5 px-5">
          <GlisseTabBar
            aria-label="بخش‌های اصلی"
            className="muis-glisse-tabbar"
            value={current}
            link={RouterAnchor}
            items={[...DOCK_ITEMS].reverse().map((item) => ({
              value: item.tab,
              label: item.label,
              href: item.to,
              icon: <item.icon strokeWidth={1.8} />,
            }))}
          />
          <GlisseButton
            aria-label={SEARCH_ITEM.label}
            className="muis-glisse-search"
            icon={<SEARCH_ITEM.icon strokeWidth={1.8} />}
            onClick={() => void navigate({ to: SEARCH_ITEM.to })}
          />
        </div>
      </nav>
    </>
  );
}

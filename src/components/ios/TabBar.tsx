import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button as GlisseButton, TabBar as GlisseTabBar } from "glisse";
import type { ComponentPropsWithoutRef } from "react";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";

type RouterAnchorProps = ComponentPropsWithoutRef<"a"> & { href: string };

/** Glisse supplies href; TanStack Router needs to receive it as to. */
function RouterAnchor({ href, ...props }: RouterAnchorProps) {
  return <Link to={href} {...props} />;
}

export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const current = tabForPath(pathname);

  return (
    <>
      {/* Glisse Liquid Glass dock stays active independently of the app-wide glass toggle. */}
      <nav
        aria-label="ناوبری اصلی"
        className="muis-glisse-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(max(env(safe-area-inset-bottom,0px),0.5rem)+4px)]"
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

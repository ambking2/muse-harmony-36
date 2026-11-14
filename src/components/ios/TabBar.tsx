import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button as GlisseButton, TabBar as GlisseTabBar } from "glisse";
import { Component } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { DOCK_ITEMS, SEARCH_ITEM, tabForPath } from "@/lib/design/tabs";
import { useMounted } from "@/hooks/use-mounted";

type RouterAnchorProps = ComponentPropsWithoutRef<"a"> & { href: string };

/** Glisse supplies href; TanStack Router needs to receive it as to. */
function RouterAnchor({ href, ...props }: RouterAnchorProps) {
  return <Link to={href} {...props} />;
}

/* If the liquid engine throws during React's hydration recovery (refs go
   detached when the tree is regenerated), the dock falls back to the frosted
   slab instead of taking the whole page down. */
class GlassBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const frostSlab = (
  <div className="material lens specular dock-hero pointer-events-auto relative flex w-[min(100%-3.75rem,19rem)] items-center justify-around overflow-hidden rounded-[2.25rem] border border-ios-separator px-2 py-1.5 shadow-[var(--floating-shadow)]">
    {DOCK_ITEMS.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        className="press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.75rem] px-3.5 text-ios-label-secondary transition-colors duration-200 hover:text-ios-tint"
      >
        <item.icon className="size-6" strokeWidth={1.8} />
        <span className="type-caption leading-none">{item.label}</span>
      </Link>
    ))}
  </div>
);

export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const current = tabForPath(pathname);
  // Glisse measures its own DOM in a mount effect; rendering it during SSR +
  // hydration hands the attach step detached refs (the "باز نشد" crash).
  // The dock joins the page only once hydration has settled.
  const mounted = useMounted();

  if (!mounted) return null;

  return (
    <>
      {/* Glisse Liquid Glass dock stays active independently of the app-wide glass toggle. */}
      <nav
        aria-label="ناوبری اصلی"
        className="muis-glisse-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(max(env(safe-area-inset-bottom,0px),0.5rem)+4px)]"
      >
        <div className="muis-glisse-dock-inner pointer-events-auto flex w-full items-center justify-center gap-2.5 px-5">
          <GlassBoundary fallback={frostSlab}>
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
          </GlassBoundary>
          <GlassBoundary fallback={frostSlab}>
            <GlisseButton
              aria-label={SEARCH_ITEM.label}
              className="muis-glisse-search"
              icon={<SEARCH_ITEM.icon strokeWidth={1.8} />}
              onClick={() => void navigate({ to: SEARCH_ITEM.to })}
            />
          </GlassBoundary>
        </div>
      </nav>
    </>
  );
}

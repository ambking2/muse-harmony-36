import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ios/EmptyState";
import { GroupTitle } from "@/components/ios/GroupTitle";
import { Reveal } from "@/components/ios/Reveal";
import { Row } from "@/components/ios/Row";
import { Screen } from "@/components/ios/Screen";
import { useLibrary } from "@/stores/library";

export const Route = createFileRoute("/search-history")({ component: SearchHistoryPage });

/**
 * Every search, newest first.
 *
 * The search page only shows the last five, because that is all anyone reaches
 * for; this is the rest of it, on its own screen, where the list can be as
 * long as it needs to be and clearing it is one tap rather than a hunt.
 */
function SearchHistoryPage() {
  const searchHistory = useLibrary((state) => state.searchHistory);
  const clearSearchHistory = useLibrary((state) => state.clearSearchHistory);

  return (
    <AppShell>
      <Screen
        title="جستجوهای اخیر"
        back={{ to: "/explore", label: "جستجو" }}
        actions={
          searchHistory.length > 0 ? (
            <button
              type="button"
              onClick={clearSearchHistory}
              className="press type-footnote rounded-lg px-2 py-2 text-ios-red"
            >
              پاک کردن همه
            </button>
          ) : undefined
        }
      >
        {searchHistory.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="هنوز جستجویی نکرده‌اید"
            description="هر چیزی که در جستجو بنویسید اینجا می‌ماند تا بعداً دوباره پیدایش کنید."
            action={
              <Link to="/explore" className="btn btn-filled">
                رفتن به جستجو
              </Link>
            }
          />
        ) : (
          <Reveal index={0}>
            <section className="card">
              <GroupTitle value={`${searchHistory.length.toLocaleString("fa-IR")} مورد`}>
                همه‌ی جستجوها
              </GroupTitle>
              <div className="inset-divided">
                {searchHistory.map((query) => (
                  <Row
                    key={query}
                    plain
                    icon={Clock}
                    tone="slate"
                    label={query}
                    to={`/explore?q=${encodeURIComponent(query)}`}
                  />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {searchHistory.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={clearSearchHistory}
              className="press btn btn-gray w-full"
            >
              <Trash2 className="size-4" strokeWidth={2} />
              پاک کردن تاریخچه
            </button>
          </div>
        )}
      </Screen>
    </AppShell>
  );
}

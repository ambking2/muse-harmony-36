import { ArrowUpLeft, Clock, Mic2, Search, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Row } from "@/components/ios/Row";
import { Section } from "@/components/ios/Section";
import { useLibrary } from "@/stores/library";
import { featuredIranianArtists } from "@/lib/aliases";

/**
 * What search shows before anything is typed.
 *
 * Three ways in, in the order a listener reaches for them: a voice they already
 * follow, something they searched for recently, and a term to try. Everything
 * here is a shortcut — one tap starts a search.
 *
 * Recent searches are capped at five. The list is a doorway, not an archive:
 * the sixth search down is a coincidence, and a page that grows without bound
 * pushes the suggestions that still matter off the screen. Whatever is behind
 * the cap is one tap away on its own page.
 */
const RECENT_LIMIT = 5;

export function IdleScreen({
  suggestions,
  onPick,
}: {
  /** Persian type-ahead shown above the sections while typing. */
  suggestions: readonly string[];
  onPick: (query: string) => void;
}) {
  const searchHistory = useLibrary((state) => state.searchHistory);
  const artists = featuredIranianArtists(12);
  const recent = searchHistory.slice(0, RECENT_LIMIT);
  const older = searchHistory.length - recent.length;

  return (
    <>
      {suggestions.length > 0 && (
        <Section title="منظورتان این بود؟">
          {suggestions.map((suggestion) => (
            <Row
              key={suggestion}
              icon={Search}
              tone="blue"
              label={suggestion}
              onClick={() => onPick(suggestion)}
            />
          ))}
        </Section>
      )}

      <section className="card mb-8 overflow-hidden">
        <div className="px-5 pb-2 pt-5">
          <h2 className="type-footnote text-ios-label-secondary">جستجوهای اخیر</h2>
        </div>
        <div className="inset-divided">
          {searchHistory.length === 0 ? (
            <Row plain icon={Clock} tone="slate" label="هنوز جستجویی نکرده‌اید" />
          ) : (
            <>
              {recent.map((query) => (
                <Row
                  key={query}
                  plain
                  icon={Clock}
                  tone="slate"
                  label={query}
                  onClick={() => onPick(query)}
                />
              ))}
              {older > 0 && (
                <Row
                  plain
                  icon={ArrowUpLeft}
                  tone="blue"
                  label="همه‌ی جستجوها"
                  detail={`${searchHistory.length.toLocaleString("fa-IR")} جستجوی ثبت‌شده`}
                  to="/search-history"
                />
              )}
            </>
          )}
        </div>

        <div className="inset-divided border-t border-ios-separator">
          <div className="px-5 pb-2 pt-5">
            <h2 className="type-footnote text-ios-label-secondary">جستجوهای محبوب</h2>
          </div>
          {POPULAR.map((query) => (
            <Row
              key={query}
              plain
              icon={Sparkles}
              tone="orange"
              label={query}
              onClick={() => onPick(query)}
            />
          ))}
        </div>

        <div className="inset-divided border-t border-ios-separator">
          <div className="px-5 pb-2 pt-5">
            <h2 className="type-footnote text-ios-label-secondary">خواننده‌های ایرانی</h2>
          </div>
          {artists.map((artist) => (
            <Row
              key={artist.latin}
              plain
              icon={Mic2}
              tone="sky"
              label={artist.fa}
              detail={artist.latin}
              to={`/artist/${encodeURIComponent(artist.fa)}`}
            />
          ))}
        </div>
      </section>

      <div className="pb-4 text-center">
        <Link to="/studio" className="type-footnote text-ios-label-tertiary">
          استودیوی ساخت پلی‌لیست
        </Link>
      </div>
    </>
  );
}

const POPULAR = [
  "محسن یگانه",
  "بنیامین بهزاد",
  "گوگوش",
  "همایون شجری پور",
  "امیر تتلو",
  "علیرضا طلیسچی",
  "The Weeknd",
  "Taylor Swift",
];

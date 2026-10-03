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
              tone="tint"
              label={suggestion}
              onClick={() => onPick(suggestion)}
            />
          ))}
        </Section>
      )}

      <Section
        title="جستجوهای اخیر"
        action={
          searchHistory.length > 0 ? (
            <Link
              to="/search-history"
              className="press type-footnote rounded-lg px-2 py-2 text-ios-tint"
            >
              همه
            </Link>
          ) : undefined
        }
      >
        {searchHistory.length === 0 ? (
          <Row icon={Clock} tone="gray" label="هنوز جستجویی نکرده‌اید" />
        ) : (
          <>
            {recent.map((query) => (
              <Row
                key={query}
                icon={Clock}
                tone="gray"
                label={query}
                onClick={() => onPick(query)}
              />
            ))}
            {older > 0 && (
              <Row
                icon={ArrowUpLeft}
                tone="tint"
                label="همه‌ی جستجوها"
                detail={`${searchHistory.length.toLocaleString("fa-IR")} جستجوی ثبت‌شده`}
                to="/search-history"
              />
            )}
          </>
        )}
      </Section>

      <Section title="جستجوهای محبوب">
        {POPULAR.map((query) => (
          <Row
            key={query}
            icon={Sparkles}
            tone="orange"
            label={query}
            onClick={() => onPick(query)}
          />
        ))}
      </Section>

      <Section title="خواننده‌های ایرانی">
        {artists.map((artist) => (
          <Row
            key={artist.latin}
            icon={Mic2}
            tone="purple"
            label={artist.fa}
            detail={artist.latin}
            to={`/artist/${encodeURIComponent(artist.fa)}`}
          />
        ))}
      </Section>

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

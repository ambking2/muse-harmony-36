import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { useMounted } from "@/hooks/use-mounted";
import { standard } from "@/lib/design/motion";

/**
 * The masthead at the top of home: what this app is, and the one action most
 * visitors came for. It is deliberately short — a full-height marketing hero
 * would push the library, the player and everything else off the first screen,
 * and home is a place people return to, not a page they arrive at once.
 *
 * No wash of colour behind the wordmark. The background already moves with
 * whatever is playing, and a second tint on top of it only fought with it: the
 * page had two sources of colour saying the same thing, and the loudest one
 * was behind the app's own name. The card stands on its own instead.
 */
export function HomeHero() {
  const mounted = useMounted();

  return (
    <motion.section
      initial={mounted ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={standard}
      className="relative mb-6"
    >
      <div className="rounded-card border border-ios-separator bg-ios-surface/70 p-5 backdrop-blur-2xl">
        <p className="type-large-title">muis</p>
        <p className="type-body mt-1 text-ios-label-secondary">
          موسیقی ایرانی و جهانی — جستجو با نام فارسی، متن ترانه، پخش آفلاین.
        </p>
        <Link
          to="/explore"
          className="press mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-ios-fill px-3 text-ios-label-secondary"
        >
          <Search className="size-4 shrink-0" strokeWidth={2.5} />
          <span className="type-body">جستجوی آهنگ، خواننده یا آلبوم</span>
        </Link>
      </div>
    </motion.section>
  );
}

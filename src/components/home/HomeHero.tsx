import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { useMounted } from "@/hooks/use-mounted";
import { standard } from "@/lib/design/motion";

export function HomeHero() {
  const mounted = useMounted();

  return (
    <motion.section
      initial={mounted ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={standard}
      className="record-archive-header"
    >
      <div className="record-archive-brand">
        <p className="type-title-2 font-bold tracking-tight">muis<span className="text-ios-tint">.</span></p>
        <span className="type-footnote text-ios-label-secondary">آرشیو موسیقی</span>
      </div>
      <Link
        to="/explore"
        className="record-archive-search press"
        aria-label="جستجوی آهنگ، خواننده یا آلبوم"
      >
        <Search className="size-5 shrink-0 text-ios-tint" strokeWidth={2.2} />
        <span className="type-body">جستجوی آهنگ، خواننده یا آلبوم</span>
      </Link>
    </motion.section>
  );
}

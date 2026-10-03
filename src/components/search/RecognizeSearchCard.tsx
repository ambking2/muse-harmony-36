import { Link } from "@tanstack/react-router";
import { Mic, ChevronRight } from "lucide-react";

export function RecognizeSearchCard() {
  return (
    <Link
      to="/recognize"
      className="press group mt-3 flex items-center gap-3 rounded-2xl border border-ios-separator bg-ios-surface/70 p-3 backdrop-blur-xl"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ios-fill">
        <Mic className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block type-body font-semibold text-ios-label">تشخیص آهنگ</span>
        <span className="block type-footnote text-ios-label-secondary">
          صدای آهنگ را پخش کن تا پیدایش کنیم
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ios-label-secondary rtl:rotate-180" />
    </Link>
  );
}

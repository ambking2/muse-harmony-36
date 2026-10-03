import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mic } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Screen } from "@/components/ios/Screen";
import { RecognizeSong } from "@/components/home/RecognizeSong";

export const Route = createFileRoute("/recognize")({
  component: RecognizePage,
});

function RecognizePage() {
  return (
    <AppShell>
      <Screen title="تشخیص آهنگ" subtitle="چند ثانیه از آهنگ را پخش کن">
        <div className="mt-4">
          <Link
            to="/explore"
            className="press inline-flex items-center gap-2 text-ios-label-secondary"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            <span className="type-footnote">بازگشت به جستجو</span>
          </Link>

          <div className="mt-5 overflow-hidden rounded-3xl border border-ios-separator bg-ios-surface/70 p-5 backdrop-blur-2xl">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-ios-fill">
              <Mic className="size-9" strokeWidth={1.8} />
            </div>

            <div className="mt-5 text-center">
              <h1 className="type-title-2">آهنگ را پیدا کن</h1>
              <p className="type-body mt-2 text-ios-label-secondary">
                آهنگ را از هر منبعی پخش کن و اجازه بده Muse Harmony آن را تشخیص دهد.
              </p>
            </div>

            <RecognizeSong />
          </div>
        </div>
      </Screen>
    </AppShell>
  );
}

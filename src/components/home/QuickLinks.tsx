import {
  Download,
  HardDrive,
  Heart,
  ListMusic,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";

import { GroupTitle } from "@/components/ios/GroupTitle";
import { Reveal } from "@/components/ios/Reveal";
import { Row } from "@/components/ios/Row";
import { useLibrary } from "@/stores/library";
import { useSession } from "@/lib/account";

/**
 * The shortcuts at the bottom of home.
 *
 * The same object as everywhere else in the app: one card, one heading, rows
 * inside it with a hairline between them. The leading icon says what a row is
 * before the text is read, and the trailing count says whether opening it is
 * worth the trip.
 */
export function QuickLinks() {
  const library = useLibrary((state) => state.library);
  const favorites = useLibrary((state) => state.favorites);
  const downloads = useLibrary(
    (state) => state.downloads.filter((item) => item.status === "done").length,
  );
  const { data: session } = useSession();

  return (
    <Reveal index={0} className="mb-8">
      <section className="card">
        <GroupTitle value={`${library.length.toLocaleString("fa-IR")} آهنگ`}>
          کتابخانه‌ی شما
        </GroupTitle>
        <div className="inset-divided">
          <Row
            plain
            icon={HardDrive}
            tone="orange"
            label="آهنگ‌ها"
            to="/library"
            value={library.length.toLocaleString("fa-IR")}
          />
          <Row
            plain
            icon={Heart}
            tone="pink"
            label="علاقه‌مندی‌ها"
            to="/favorites"
            value={favorites.length.toLocaleString("fa-IR")}
          />
          <Row
            plain
            icon={ListMusic}
            tone="purple"
            label="پلی‌لیست‌ها"
            to="/library"
            detail="ساخته‌شده توسط شما"
          />
          <Row
            plain
            icon={Download}
            tone="teal"
            label="پخش آفلاین"
            to="/downloads"
            value={downloads ? `${downloads.toLocaleString("fa-IR")} فایل` : undefined}
          />
          <Row plain icon={SettingsIcon} tone="gray" label="تنظیمات" to="/settings" />
          <Row
            plain
            icon={UserRound}
            tone="tint"
            label={session?.username ?? "ورود و ثبت‌نام"}
            detail={
              session
                ? "پلی‌لیست‌ها با حساب شما همگام می‌شوند"
                : "پلی‌لیست‌ها را با حساب خودتان همگام کنید"
            }
            to="/account"
          />
        </div>
      </section>
    </Reveal>
  );
}

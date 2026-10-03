import {
  Download,
  HardDrive,
  Heart,
  ListMusic,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";

import { Row } from "@/components/ios/Row";
import { Section } from "@/components/ios/Section";
import { useLibrary } from "@/stores/library";
import { useSession } from "@/lib/account";

/**
 * The shortcuts list on home.
 *
 * Grouped rows rather than a grid of cards, because these are destinations,
 * not content: the row's leading icon says what it is before the text is read,
 * and the trailing count tells the user whether opening it is worth it.
 */
export function QuickLinks() {
  const library = useLibrary((state) => state.library);
  const favorites = useLibrary((state) => state.favorites);
  const downloads = useLibrary(
    (state) => state.downloads.filter((item) => item.status === "done").length,
  );
  const { data: session } = useSession();

  return (
    <Section title="کتابخانه‌ی شما">
      <Row
        icon={HardDrive}
        tone="orange"
        label="آهنگ‌ها"
        to="/library"
        value={library.length.toLocaleString("fa-IR")}
      />
      <Row
        icon={Heart}
        tone="pink"
        label="علاقه‌مندی‌ها"
        to="/favorites"
        value={favorites.length.toLocaleString("fa-IR")}
      />
      <Row
        icon={ListMusic}
        tone="purple"
        label="پلی‌لیست‌ها"
        to="/library"
        detail="ساخته‌شده توسط شما"
      />
      <Row
        icon={Download}
        tone="teal"
        label="پخش آفلاین"
        to="/downloads"
        value={downloads ? `${downloads.toLocaleString("fa-IR")} فایل` : undefined}
      />
      <Row icon={SettingsIcon} tone="gray" label="تنظیمات" to="/settings" />
      <Row
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
    </Section>
  );
}

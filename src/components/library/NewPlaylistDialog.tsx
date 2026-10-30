import { Plus } from "lucide-react";
import { Button as GlisseButton } from "glisse";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLibrary } from "@/stores/library";

/**
 * "New playlist", as an alert with a field in it — the same shape iOS uses for
 * anything that needs one line of input before it can go ahead.
 *
 * The trigger *is* the nav bar button, not a wrapper: the dialog has to grow
 * out of the control that opened it, and a controlled dialog rendered
 * somewhere else animates in from the middle of the screen instead.
 */
export function NewPlaylistDialog() {
  const createPlaylist = useLibrary((state) => state.createPlaylist);
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createPlaylist(trimmed);
    setName("");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <GlisseButton
          type="button"
          className="muis-glisse-create"
          icon={<Plus strokeWidth={2.2} />}
          aria-label="پلی‌لیست جدید"
        />
      </AlertDialogTrigger>

      <AlertDialogContent className="material-thick max-w-sm gap-4 rounded-sheet border-ios-separator p-5">
        <AlertDialogHeader className="space-y-1 text-right">
          <AlertDialogTitle className="type-title-3">پلی‌لیست جدید</AlertDialogTitle>
          <AlertDialogDescription className="type-subheadline">
            یک نام برای پلی‌لیست تازه بگذارید.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="مثلاً: آهنگ‌های شب"
          className="type-body min-h-11 rounded-xl bg-ios-fill px-3 outline-none placeholder:text-ios-label-tertiary focus-visible:ring-2 focus-visible:ring-ios-tint"
        />

        <AlertDialogFooter className="flex-row-reverse items-stretch gap-2 sm:justify-start [&>button]:m-0 [&>button]:inline-flex [&>button]:h-11 [&>button]:min-h-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-xl [&>button]:px-4 [&>button]:py-0 [&>button]:text-sm [&>button]:leading-none">
          <AlertDialogCancel className="btn btn-gray flex-1">انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={submit}
            disabled={!name.trim()}
            className="btn btn-filled flex-1"
          >
            ساختن
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

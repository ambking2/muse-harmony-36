import { Plus } from "lucide-react";
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
        <button type="button" className="glass-btn press text-ios-tint" aria-label="پلی‌لیست جدید">
          <Plus className="size-6" strokeWidth={2.2} />
        </button>
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

        <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start">
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

import { Search, X } from "lucide-react";
import type { RefObject } from "react";

import { cn } from "@/lib/utils";

/**
 * The search field, styled as an iOS search bar.
 *
 * Lives inside a filled capsule rather than a bordered box, with the clear
 * button as a filled circle inside the field — the same affordance every iOS
 * app uses, and one the eye already knows.
 */
export function SearchField({
  value,
  onChange,
  placeholder = "جستجو",
  inputRef,
  onKeyDown,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-11 items-center gap-2 rounded-xl bg-ios-fill px-3", className)}>
      <Search className="size-4 shrink-0 text-ios-label-secondary" strokeWidth={2.5} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="type-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-ios-label-tertiary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="پاک کردن"
          className="press grid size-6 shrink-0 place-items-center rounded-full bg-ios-fill-strong text-ios-label-secondary"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

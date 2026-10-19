import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useState, type RefObject } from "react";

import { snappy } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

/**
 * Search field as a raised, rounded material surface. Focus is shown with a
 * restrained tint ring; the glass itself follows the app-wide glass setting.
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
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      animate={{ scale: focused ? 1.01 : 1 }}
      transition={snappy}
      className={cn(
        "material specular flex min-h-14 items-center gap-3 rounded-2xl border px-4 transition-[border-color,box-shadow] duration-200",
        focused
          ? "border-ios-tint ring-2 ring-ios-tint/15"
          : "border-ios-separator",
        className,
      )}
    >
      <motion.span
        animate={{ scale: focused ? 1.08 : 1 }}
        transition={snappy}
        className="flex shrink-0"
        aria-hidden
      >
        <Search
          className={cn(
            "size-5 transition-colors duration-200",
            focused ? "text-ios-tint" : "text-ios-label-secondary",
          )}
          strokeWidth={2.2}
        />
      </motion.span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="type-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-ios-label-tertiary"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            key="clear"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileTap={{ scale: 0.85 }}
            transition={snappy}
            onClick={() => onChange("")}
            aria-label="پاک کردن"
            className="press grid size-8 shrink-0 place-items-center rounded-full bg-ios-fill-strong text-ios-label-secondary"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

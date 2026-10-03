import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useState, type RefObject } from "react";

import { snappy } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

/**
 * The search field, styled as an iOS search bar.
 *
 * Lives inside a filled capsule rather than a bordered box, with the clear
 * button as a filled circle inside the field — the same affordance every iOS
 * app uses, and one the eye already knows.
 *
 * Focus is answered with motion: the capsule swells a hair and takes the tint,
 * and gives both back on blur. Without that, typing feels like typing into a
 * static box on a page where everything else moves. The clear button fades in
 * instead of appearing between two taps.
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
      animate={{ scale: focused ? 1.012 : 1 }}
      transition={snappy}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-xl bg-ios-fill px-3 transition-shadow duration-200",
        focused && "shadow-[0_0_0_2px_var(--color-ios-tint)]",
        className,
      )}
    >
      <motion.span
        animate={{ scale: focused ? 1.08 : 1, rotate: focused ? -8 : 0 }}
        transition={snappy}
        className="flex shrink-0"
        aria-hidden
      >
        <Search
          className={cn(
            "size-4 transition-colors duration-200",
            focused ? "text-ios-tint" : "text-ios-label-secondary",
          )}
          strokeWidth={2.5}
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
            className="press grid size-6 shrink-0 place-items-center rounded-full bg-ios-fill-strong text-ios-label-secondary"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

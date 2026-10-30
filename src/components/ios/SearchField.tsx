import { AnimatePresence, motion } from "framer-motion";
import { Input } from "glisse";
import { Search, X } from "lucide-react";
import { useState, type RefObject } from "react";

import { snappy } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

/**
 * Search and filter field using Glisse's real refracting Input surface.
 * Keeps the app's controlled value API, Persian placeholder and clear action.
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
      className={cn("w-full", className)}
    >
      <Input
        ref={inputRef}
        value={value}
        onValueChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        type="text"
        dir="auto"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        icon={
          <Search
            className={cn(
              "size-5 transition-colors duration-200",
              focused ? "text-ios-tint" : "text-ios-label-secondary",
            )}
            strokeWidth={2.2}
          />
        }
        className="muis-glisse-input"
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
            className="press absolute"
            style={{ display: "none" }}
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

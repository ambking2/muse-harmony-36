import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Adapted from the uibeats loading-button (MIT) to framer-motion, which this
// app already ships. Variants were added so the button can sit in the row of
// glass pills on the now-playing screen as well as stand alone.

const loadingButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full px-4 py-2 text-sm font-medium transition-[filter,background-color,color] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110",
        // The now-playing secondary actions are all glass pills; this lets the
        // busy state live in that row without the row changing shape.
        glass: "glass hover:brightness-125",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type Status = "idle" | "loading" | "success";

/**
 * The native button attributes, minus the ones `motion.button` re-types for
 * its own use (drag and gesture handlers take a second argument here, and
 * style/animation are passed through as motion props). Leaving them in makes
 * every caller's own handlers fail to typecheck for no benefit — none of them
 * are used on a button that only animates a spinner and a label.
 */
type NativeButtonProps = Omit<
  React.ComponentProps<"button">,
  | "children"
  | "ref"
  | "style"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onTransitionStart"
  | "onTransitionEnd"
  | "onTransitionRun"
  | "onTransitionCancel"
>;

interface LoadingButtonProps extends NativeButtonProps, VariantProps<typeof loadingButtonVariants> {
  children: ReactNode;
  /** The async work. Rejecting returns the button to idle rather than stranding it. */
  onAction?: () => void | Promise<void>;
  /** Label while the action is in flight. */
  loadingText?: string;
  /** Label shown briefly once the action resolves. */
  successText?: string;
  /** Seconds the success label stays up before the button returns to idle. */
  successDuration?: number;
}

/**
 * A button that runs one async action and reports on it in place.
 *
 * The button owns the busy state rather than taking it as a prop, because the
 * two things that usually go wrong with a button like this are both timing
 * bugs a caller has to remember to avoid: a second click landing while the
 * first request is still open, and the busy flag never clearing on the failure
 * path. Here the click is ignored unless the status is `idle`, and the status
 * is restored either way, so a rejected action returns the button to idle
 * instead of stranding it on a spinner.
 *
 * This is what makes "کپی شد" trustworthy: the success label is only shown
 * after the clipboard write actually resolved, rather than being fired
 * optimistically and then being wrong.
 *
 * The spinner keeps turning under `prefers-reduced-motion`: it is the only
 * signal that the request is still open, but the width and label transitions
 * are dropped.
 */
export function LoadingButton({
  children,
  onAction,
  loadingText = "در حال انجام…",
  successText = "انجام شد",
  successDuration = 1.6,
  variant,
  className,
  onClick,
  disabled,
  ...props
}: LoadingButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const prefersReducedMotion = useReducedMotion();
  // The action is awaited, so the component can unmount before it settles.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => setStatus("idle"), Math.max(0, successDuration) * 1000);
    return () => clearTimeout(timer);
  }, [status, successDuration]);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Refused before the caller's handler runs. The button is `aria-disabled`
      // rather than `disabled` while busy, so the browser still delivers the
      // click and this guard is the only thing standing between an impatient
      // second press and a duplicate request.
      if (status !== "idle") return;
      onClick?.(event);

      setStatus("loading");
      try {
        await onAction?.();
        if (mounted.current) setStatus("success");
      } catch {
        // The caller owns error reporting; the button's only job is to stop
        // claiming the request is still running.
        if (mounted.current) setStatus("idle");
      }
    },
    [onAction, onClick, status],
  );

  const label = status === "loading" ? loadingText : status === "success" ? successText : children;

  return (
    <motion.button
      layout={!prefersReducedMotion}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      onClick={handleClick}
      /*
       * Busy is `aria-disabled`, not `disabled`. A real `disabled` attribute
       * drops focus in most browsers, and the button is almost always focused
       * at that moment because the click is what made it busy, so the label
       * change to "در حال انجام…" would go unannounced by the screen reader
       * that most needed it. The click is refused by `handleClick` either way.
       */
      disabled={disabled}
      aria-disabled={disabled || status !== "idle"}
      aria-busy={status === "loading"}
      data-status={status}
      className={cn(
        loadingButtonVariants({ variant }),
        "data-[status=success]:bg-success data-[status=success]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          className="flex items-center gap-1.5 whitespace-nowrap"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {status === "loading" && <Loader2 className="animate-spin" />}
          {status === "success" && <Check />}
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

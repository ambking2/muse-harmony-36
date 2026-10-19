import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { mix } from "./geometry";
import {
  AUTO_DISMISS,
  BLUR_INTENSITY,
  COLLAPSE_SPRING,
  DRAG_SPRING,
  DROP_SPRING,
  DROP_TINT_END,
  DROP_TINT_START,
  ENTER_EXPAND_DELAY,
  ENTER_REVEAL_DELAY,
  ENTER_TINT_DELAY,
  EXIT_COLLAPSE_DELAY,
  EXIT_DROP_DELAY,
  EXPAND_SPRING,
  FADE_SPRING,
  GOO_BLUR_MAX,
  GOO_BLUR_MIN,
  GOO_GAIN,
  GOO_INSET_RATIO,
  GOO_STRENGTH,
  GOO_THRESHOLD,
  PALETTE,
  RETURN_SPRING,
  REVEAL_SPRING,
  SHADOW_BLUR,
  SHADOW_DY,
  SWIPE_DISTANCE,
  SWIPE_VELOCITY,
  TINT_SPRING,
  type Spring,
} from "./constants";
import { DynamicNotificationsContext, useDynamicNotifications } from "./context";
import type { DynamicNotificationsValue } from "./context";
import type { IslandNotification } from "./types";
import {
  buildNotificationGeometry,
  clamp,
  contentScale,
  getNotificationLayout,
  type NotificationGeometry,
  type NotificationLayout,
} from "./geometry";

/**
 * Dynamic Island notifications, ported to the web.
 *
 * The original (github.com/rit3zh/expo-dynamic-notifications) is a React Native
 * component: an island pill at the top of the screen grows a droplet out of its
 * underside, the droplet falls, stretches a neck behind it, then swells into
 * the notification card while its colour travels from the island's black to the
 * card's white. The merge is a Skia `Blur` + `ColorMatrix`, driven by five
 * Reanimated shared values.
 *
 * None of that hardware exists on the web, so the same thing is rebuilt from
 * the pieces a browser does have:
 *
 *   - the **shared values** are framer-motion motion values, animated with the
 *     original's spring durations and damping ratios;
 *   - the **Skia colour matrix** is an SVG `feColorMatrix` on the alpha channel
 *     with the same gain and threshold, which is the same maths applied by the
 *     same kind of engine;
 *   - the **Skia blur** is `feGaussianBlur` on the same radius;
 *   - the **canvas geometry** is the original `build-notification-geometry`,
 *     unchanged, driving absolutely positioned elements.
 *
 * What is deliberately different: the pill is only on screen while a
 * notification is arriving, being read and leaving. On a phone the island is
 * part of the device and is always there; on a web page a black pill floating
 * over the content forever would be a hole in the layout, not a feature.
 */

/* ------------------------------------------------------------- the provider */

/**
 * `duration` is the default lifetime in milliseconds; `null` disables
 * auto-dismiss. `onDismiss` runs after a notification has finished leaving.
 */
export function DynamicNotifications({
  children,
  duration,
  strength = GOO_STRENGTH,
  blur,
  gain = GOO_GAIN,
  threshold = GOO_THRESHOLD,
  accent = PALETTE.accent,
  width,
  insetTop = 0,
  onDismiss,
}: {
  children: ReactNode;
  duration?: number | null;
  /** 0..1, mapped onto the goo filter's blur radius. */
  strength?: number;
  /** Explicit goo blur radius, in pixels. Overrides `strength`. */
  blur?: number;
  /** Alpha gain of the goo filter. */
  gain?: number;
  /** Alpha cutoff of the goo filter. */
  threshold?: number;
  accent?: string;
  /** The surface the island is measured against. Defaults to the viewport. */
  width?: number;
  /** Space to leave above the island. 0 on the web. */
  insetTop?: number;
  onDismiss?: (notification: IslandNotification) => void;
}) {
  const viewport = useViewportWidth();
  const layout = useMemo(
    () => getNotificationLayout({ width: width ?? viewport, insetTop }),
    [width, viewport, insetTop],
  );
  const radius = useMemo(
    () => blur ?? mix(clamp(strength, 0, 1), GOO_BLUR_MIN, GOO_BLUR_MAX),
    [blur, strength],
  );

  const timeline = useNotificationTimeline({ duration, onDismiss });

  const value = useMemo<DynamicNotificationsValue>(
    () => ({ ...timeline, layout, accent, blur: radius }),
    [timeline, layout, accent, radius],
  );

  return (
    <DynamicNotificationsContext.Provider value={value}>
      {children}
      {timeline.notification !== null && (
        <IslandOverlay notification={timeline.notification} gain={gain} threshold={threshold} />
      )}
    </DynamicNotificationsContext.Provider>
  );
}

/* ------------------------------------------------------------- the timeline */

interface Timeline {
  trigger: (notification: IslandNotification) => void;
  dismiss: () => void;
  isVisible: boolean;
  notification: IslandNotification | null;
  drop: MotionValue<number>;
  expand: MotionValue<number>;
  reveal: MotionValue<number>;
  tint: MotionValue<number>;
  dragY: MotionValue<number>;
}

function useNotificationTimeline({
  duration,
  onDismiss,
}: {
  duration?: number | null;
  onDismiss?: (notification: IslandNotification) => void;
}): Timeline {
  const drop = useMotionValue(0);
  const expand = useMotionValue(0);
  const reveal = useMotionValue(0);
  const tint = useMotionValue(0);
  const dragY = useMotionValue(0);

  const [notification, setNotification] = useState<IslandNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  // Bumped on every enter, so the effect that starts the animation re-runs even
  // when the same notification is triggered twice in a row.
  const [session, setSession] = useState(0);

  const reduced = useReducedMotion() ?? false;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<IslandNotification | null>(null);
  const queued = useRef<IslandNotification | null>(null);
  const exiting = useRef(false);
  const dismissed = useRef(onDismiss);
  dismissed.current = onDismiss;

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const enter = useCallback(
    (next: IslandNotification) => {
      clearTimer();
      current.current = next;
      exiting.current = false;
      setNotification(next);
      setIsVisible(true);
      setSession((value) => value + 1);

      drop.jump(0);
      expand.jump(0);
      reveal.jump(0);
      tint.jump(0);
      dragY.jump(0);

      const fallback = duration === undefined ? AUTO_DISMISS : duration;
      const lifetime = next.duration === undefined ? fallback : next.duration;
      if (lifetime !== null) {
        // Same clock as the original: the reveal delay first, then the
        // notification's own lifetime.
        timer.current = setTimeout(() => exitRef.current(), ENTER_REVEAL_DELAY + lifetime);
      }
    },
    [clearTimer, dragY, drop, duration, expand, reveal, tint],
  );

  useEffect(() => {
    if (session === 0) return;
    to(reduced, drop, 1, DROP_SPRING);
    to(reduced, tint, 1, TINT_SPRING, ENTER_TINT_DELAY);
    to(reduced, expand, 1, EXPAND_SPRING, ENTER_EXPAND_DELAY);
    to(reduced, reveal, 1, REVEAL_SPRING, ENTER_REVEAL_DELAY);
  }, [session, reduced, drop, expand, reveal, tint]);

  const settle = useCallback(() => {
    const dismissedNotification = current.current;
    const next = queued.current;
    current.current = null;
    queued.current = null;
    exiting.current = false;
    setIsVisible(false);
    if (next) enter(next);
    else setNotification(null);
    // Only once it has actually gone, so the caller can navigate or clear
    // state without cutting the exit animation short.
    if (dismissedNotification) dismissed.current?.(dismissedNotification);
  }, [enter]);

  const exit = useCallback(() => {
    if (!current.current || exiting.current) return;
    exiting.current = true;
    clearTimer();
    to(reduced, reveal, 0, FADE_SPRING);
    to(reduced, expand, 0, COLLAPSE_SPRING, EXIT_COLLAPSE_DELAY);
    to(reduced, tint, 0, RETURN_SPRING, EXIT_DROP_DELAY);
    to(reduced, drop, 0, RETURN_SPRING, EXIT_DROP_DELAY, settle);
  }, [clearTimer, drop, expand, reveal, reduced, settle, tint]);

  const exitRef = useRef(exit);
  exitRef.current = exit;

  const trigger = useCallback(
    (next: IslandNotification) => {
      // One at a time: a second notification waits for the first to leave, the
      // same queue the original keeps in a ref.
      if (current.current) {
        queued.current = next;
        exit();
        return;
      }
      enter(next);
    },
    [enter, exit],
  );

  const dismiss = useCallback(() => {
    queued.current = null;
    exit();
  }, [exit]);

  useEffect(() => clearTimer, [clearTimer]);

  return { trigger, dismiss, isVisible, notification, drop, expand, reveal, tint, dragY };
}

/**
 * Starts a spring, or jumps straight to the value when the reader has asked
 * for reduced motion. The app's `MotionConfig` covers declarative animations
 * only, and these are imperative, so the check has to be here too.
 */
function to(
  reduced: boolean,
  value: MotionValue<number>,
  target: number,
  spring: Spring,
  delayMs = 0,
  onComplete?: () => void,
) {
  if (reduced) {
    value.jump(target);
    onComplete?.();
    return;
  }
  animate(value, target, {
    type: "spring",
    duration: spring.duration,
    bounce: spring.bounce,
    delay: delayMs / 1000,
    onComplete,
  });
}

/* ------------------------------------------------------------- the overlay */

function IslandOverlay({
  notification,
  gain,
  threshold,
}: {
  notification: IslandNotification;
  gain: number;
  threshold: number;
}) {
  const { layout, drop, expand, reveal, tint, dragY, blur, accent } = useDynamicNotifications();
  const islandColor = PALETTE.island;
  const cardColor = PALETTE.card;
  const resolvedAccent = notification.accent ?? accent;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70]"
      style={{ height: layout.canvasHeight }}
    >
      <IslandGoo
        {...{ layout, drop, expand, tint, blur, gain, threshold, islandColor, cardColor }}
      />
      <IslandContent
        notification={notification}
        accent={resolvedAccent}
        dragY={dragY}
        reveal={reveal}
        drop={drop}
        expand={expand}
      />
    </div>
  );
}

function IslandGoo({
  layout,
  drop,
  expand,
  tint,
  blur,
  gain,
  threshold,
  islandColor,
  cardColor,
}: {
  layout: NotificationLayout;
  drop: MotionValue<number>;
  expand: MotionValue<number>;
  tint: MotionValue<number>;
  blur: number;
  gain: number;
  threshold: number;
  islandColor: string;
  cardColor: string;
}) {
  // One derived value for the whole shape, then one per property, so the
  // geometry maths runs once per frame rather than once per CSS property.
  const geometry = useTransform(() =>
    buildNotificationGeometry({ drop: drop.get(), expand: expand.get(), layout }),
  );
  const x = useTransform(geometry, (g: NotificationGeometry) => g.x);
  const y = useTransform(geometry, (g: NotificationGeometry) => g.y);
  const width = useTransform(geometry, (g: NotificationGeometry) => g.width);
  const height = useTransform(geometry, (g: NotificationGeometry) => g.height);
  const radius = useTransform(geometry, (g: NotificationGeometry) => g.radius);
  const neckX = useTransform(geometry, (g: NotificationGeometry) => g.neckX);
  const neckY = useTransform(geometry, (g: NotificationGeometry) => g.neckY);
  const neckWidth = useTransform(geometry, (g: NotificationGeometry) => g.neckWidth);
  const neckHeight = useTransform(geometry, (g: NotificationGeometry) => g.neckHeight);
  const neckRadius = useTransform(geometry, (g: NotificationGeometry) => g.neckRadius);
  const shadowOpacity = useTransform(geometry, (g: NotificationGeometry) => g.shadowOpacity);

  // The droplet travels from the island's black to the card's white as it
  // falls — the same two-stop interpolation the original does with
  // `interpolateColor`.
  const droplet = useTransform(() =>
    mixColor(tint.get(), islandColor, cardColor, DROP_TINT_START, DROP_TINT_END),
  );

  const inset = blur * GOO_INSET_RATIO;

  return (
    <>
      <GooDefs blur={blur} gain={gain} threshold={threshold} />

      {/* The shadow tracks the droplet and fades in as it becomes the card. */}
      <motion.div
        aria-hidden
        className="absolute"
        style={{
          left: x,
          top: y,
          width,
          height,
          borderRadius: radius,
          opacity: shadowOpacity,
          boxShadow: `0 ${SHADOW_DY}px ${SHADOW_BLUR}px ${PALETTE.shadow}`,
        }}
      />

      {/* Everything that merges: the island's underside, the neck and the
          droplet, blurred and re-thresholded by the goo filter. */}
      <div className="absolute inset-0" style={{ filter: "url(#muis-island-goo)" }} aria-hidden>
        <motion.div
          className="absolute"
          style={{
            left: layout.centerX - layout.islandWidth / 2 + inset,
            top: layout.islandTop + inset,
            width: layout.islandWidth - inset * 2,
            height: layout.islandHeight - inset * 2,
            borderRadius: Math.max(layout.islandRadius - inset, 0),
            background: islandColor,
          }}
        />
        <motion.div
          className="absolute"
          style={{
            left: neckX,
            top: neckY,
            width: neckWidth,
            height: neckHeight,
            borderRadius: neckRadius,
            background: islandColor,
          }}
        />
        <motion.div
          className="absolute"
          style={{ left: x, top: y, width, height, borderRadius: radius, background: droplet }}
        />
      </div>

      {/* The crisp island on top, so its edges stay sharp inside the blur. */}
      <div
        className="absolute"
        aria-hidden
        style={{
          left: layout.centerX - layout.islandWidth / 2,
          top: layout.islandTop,
          width: layout.islandWidth,
          height: layout.islandHeight,
          borderRadius: layout.islandRadius,
          background: islandColor,
        }}
      />
    </>
  );
}

/** The goo filter itself: blur, then an alpha colour matrix. */
function GooDefs({ blur, gain, threshold }: { blur: number; gain: number; threshold: number }) {
  return (
    <svg aria-hidden className="absolute size-0" focusable="false">
      <defs>
        <filter id="muis-island-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            // The last row is the alpha transfer: gain, and a cutoff of
            // threshold. buildGooMatrix in the original writes exactly this.
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${gain} ${-gain * threshold}`}
            result="goo"
          />
        </filter>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------- the content */

function IslandContent({
  notification,
  accent,
  dragY,
  reveal,
  drop,
  expand,
}: {
  notification: IslandNotification;
  accent: string;
  dragY: MotionValue<number>;
  reveal: MotionValue<number>;
  drop: MotionValue<number>;
  expand: MotionValue<number>;
}) {
  const { layout, isVisible, dismiss } = useDynamicNotifications();
  const reduced = useReducedMotion() ?? false;

  const geometry = useTransform(() =>
    buildNotificationGeometry({ drop: drop.get(), expand: expand.get(), layout }),
  );
  const opacity = useTransform(reveal, (value) => clamp(value, 0, 1));
  const translateY = useTransform(
    () =>
      buildNotificationGeometry({ drop: drop.get(), expand: expand.get(), layout }).offsetY +
      dragY.get(),
  );
  const scale = useTransform(() => contentScale(reveal.get(), geometry.get().widthRatio));
  // The frost that the content materialises out of, gone by the time the card
  // is opaque — and taken out of the tree entirely once it is, so the app is
  // never left with a stray backdrop-filter.
  const veilOpacity = useTransform(reveal, (value) => 1 - clamp(value, 0, 1));
  const veilBlur = useTransform(
    reveal,
    (value) => `blur(${Math.round(BLUR_INTENSITY * (1 - clamp(value, 0, 1)))}px)`,
  );
  const veilDisplay = useTransform(reveal, (value) => (value >= 0.995 ? "none" : "block"));

  // ---- the dismiss gesture: pan up to throw it away, tap to open it -------
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const travelled = useRef(0);

  const endDrag = useCallback(() => {
    dragging.current = false;
    const thrown = dragY.get() < SWIPE_DISTANCE || velocity.current < SWIPE_VELOCITY;
    if (thrown) {
      dismiss();
      return;
    }
    if (reduced) dragY.jump(0);
    else
      animate(dragY, 0, {
        type: "spring",
        duration: DRAG_SPRING.duration,
        bounce: DRAG_SPRING.bounce,
      });
  }, [dismiss, dragY, reduced]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      tabIndex={isVisible ? 0 : -1}
      className="absolute overflow-hidden outline-none"
      style={{
        top: layout.cardTop,
        left: layout.cardLeft,
        width: layout.cardWidth,
        height: layout.cardHeight,
        borderRadius: layout.cardRadius,
        opacity,
        translateY,
        scale,
        pointerEvents: isVisible ? "auto" : "none",
        touchAction: "none",
        cursor: "pointer",
      }}
      onPointerDown={(event) => {
        dragging.current = true;
        travelled.current = 0;
        velocity.current = 0;
        lastY.current = event.clientY;
        lastT.current = event.timeStamp;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const delta = event.clientY - lastY.current;
        const elapsed = event.timeStamp - lastT.current;
        if (elapsed > 0) velocity.current = (delta / elapsed) * 1000;
        lastY.current = event.clientY;
        lastT.current = event.timeStamp;
        travelled.current += Math.abs(delta);
        dragY.set(clamp(dragY.get() + delta, -120, 24));
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        if (typeof event.currentTarget.releasePointerCapture === "function") {
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // Capture is best-effort; the gesture works without it.
          }
        }
        // A tap, not a drag: the original keeps tap and pan mutually
        // exclusive, which on the web is a question of how far the finger
        // travelled.
        if (travelled.current < 6) {
          notification.onPress?.();
          dismiss();
          return;
        }
        endDrag();
      }}
      onPointerCancel={endDrag}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        notification.onPress?.();
        dismiss();
      }}
    >
      {notification.render ? (
        notification.render(notification)
      ) : (
        <NotificationBody notification={notification} accent={accent} />
      )}

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: layout.cardRadius,
          backdropFilter: veilBlur,
          opacity: veilOpacity,
          display: veilDisplay,
        }}
      />
    </motion.div>
  );
}

/** The default layout, also usable on its own from a custom `render`. */
function NotificationBody({
  notification,
  accent,
}: {
  notification: IslandNotification;
  accent: string;
}) {
  return (
    <div className="flex size-full items-center gap-3 ps-[13px] pe-5">
      {notification.avatar ? (
        <Avatar src={notification.avatar} />
      ) : (
        <div className="size-[46px] shrink-0 rounded-full" style={{ background: PALETTE.avatar }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold" style={{ color: accent }}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-px truncate text-[14px] font-medium" style={{ color: PALETTE.message }}>
            {notification.message}
          </p>
        )}
      </div>
      {notification.symbol && (
        <span className="flex shrink-0" style={{ color: accent }} aria-hidden>
          {notification.symbol}
        </span>
      )}
    </div>
  );
}

/** The avatar, which may arrive as a promise — cover art here is proxied. */
function Avatar({ src }: { src: NonNullable<IslandNotification["avatar"]> }) {
  const [url, setUrl] = useState<string | null>(typeof src === "string" ? src : null);

  useEffect(() => {
    if (typeof src === "string") {
      setUrl(src);
      return;
    }
    let cancelled = false;
    void Promise.resolve(src).then(
      (value) => {
        if (!cancelled) setUrl(value ?? null);
      },
      () => {
        if (!cancelled) setUrl(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!url) {
    return (
      <div className="size-[46px] shrink-0 rounded-full" style={{ background: PALETTE.avatar }} />
    );
  }

  return (
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      className="size-[46px] shrink-0 rounded-full object-cover"
      style={{ background: PALETTE.avatar }}
    />
  );
}

/* ------------------------------------------------------------------ support */

/** The droplet's colour: the tint progress mapped through the two stops. */
function mixColor(progress: number, from: string, to: string, start: number, end: number): string {
  const t = clamp((progress - start) / (end - start), 0, 1);
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

function parseHex(color: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The viewport, watched so the island stays centred when the window resizes. */
function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 390 : window.innerWidth,
  );

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

export { NotificationBody as IslandNotificationBody };
export type { NotificationGeometry, NotificationLayout };
export type { IslandNotification } from "./types";

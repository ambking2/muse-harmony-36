import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
} from "framer-motion";

import { HOME_ASSETS } from "@/lib/home-config";

/**
 * The pinned 3D stage.
 *
 * Two hexagonal-bipyramid crystals and a banded ring, built from CSS 3D faces
 * (no WebGL, no assets). One fixed layer sits behind the whole page; its
 * position, scale, tilt, rotation and "explode" amount are all functions of
 * scroll position, sampled between poses measured from the real sections, so
 * scrolling backwards plays everything backwards.
 *
 * To use authored media instead, set a src in HOME_ASSETS["hero-scene"].
 */

type Pose = { x: number; y: number; s: number; ex: number; tilt: number; o: number };

const vars = (v: Record<string, string | number>) => v as unknown as CSSProperties;

function poseFor(i: number, n: number, narrow: boolean): Pose {
  if (i === 0)
    return narrow
      ? { x: 0, y: -10, s: 0.8, ex: 0, tilt: 30, o: 1 }
      : { x: -22, y: 0, s: 1, ex: 0, tilt: 30, o: 1 };
  if (i === n - 1) return { x: 0, y: 0, s: narrow ? 0.6 : 0.85, ex: 0, tilt: 26, o: 0.9 };
  if (i === 1)
    return narrow
      ? { x: 0, y: -30, s: 0.4, ex: 26, tilt: 36, o: 0.25 }
      : { x: -33, y: 4, s: 0.5, ex: 30, tilt: 36, o: 0.5 };
  const side = i % 2 === 0 ? -1 : 1;
  const open = i % 2 === 0 ? 0 : 46;
  return narrow
    ? { x: 0, y: -32, s: 0.36, ex: open * 0.6, tilt: 34, o: 0.2 }
    : { x: side * 32, y: -4, s: 0.6, ex: open, tilt: 30 + ((i * 7) % 12), o: 0.55 };
}

function sample(y: number, keys: number[], poses: Pose[]): Pose {
  if (y <= keys[0]) return poses[0];
  const last = keys.length - 1;
  if (y >= keys[last]) return poses[last];
  let i = 0;
  while (i < last && y >= keys[i + 1]) i++;
  const t = (y - keys[i]) / (keys[i + 1] - keys[i]);
  const e = t * t * (3 - 2 * t);
  const a = poses[i];
  const b = poses[i + 1];
  const m = (p: number, q: number) => p + (q - p) * e;
  return {
    x: m(a.x, b.x),
    y: m(a.y, b.y),
    s: m(a.s, b.s),
    ex: m(a.ex, b.ex),
    tilt: m(a.tilt, b.tilt),
    o: m(a.o, b.o),
  };
}

function Crystal({ className }: { className: string }) {
  const faces = [0, 1, 2, 3, 4, 5];
  const half = (cls: string) => (
    <div className={`wm-half ${cls}`}>
      {faces.map((i) => (
        <i key={i} className="wm-face" style={vars({ "--a": `${i * 60}deg`, "--ga": `${(i * 57 + 20) % 360}deg` })} />
      ))}
    </div>
  );
  return (
    <div className={`wm-crystal ${className}`}>
      {half("wm-half-t")}
      {half("wm-half-b")}
      <span className="wm-crystal-core" />
    </div>
  );
}

const SEGMENTS = 36;
const BANDS = [
  { y: -22, h: 16, r: 224 },
  { y: 0, h: 34, r: 230 },
  { y: 22, h: 16, r: 224 },
];

function Ring() {
  return (
    <div className="wm-ring3d">
      {BANDS.map((band, b) =>
        Array.from({ length: SEGMENTS }, (_, i) => (
          <i
            key={`${b}-${i}`}
            className="wm-seg"
            style={vars({
              "--a": `${(i * 360) / SEGMENTS}deg`,
              "--by": `${band.y}px`,
              "--bh": `${band.h}px`,
              "--rr": `${band.r}px`,
            })}
          />
        )),
      )}
      {[40, 170, 290].map((deg, i) => (
        <span key={deg} className={`wm-node wm-node-${i + 1}`} style={vars({ "--a": `${deg}deg` })} />
      ))}
    </div>
  );
}

export function CrystalScene({ anchorIds, reduce }: { anchorIds: string[]; reduce: boolean }) {
  const { scrollY } = useScroll();
  const keysRef = useRef<number[]>([0]);
  const posesRef = useRef<Pose[]>([poseFor(0, 1, false)]);
  const unitRef = useRef(1);
  const tick = useMotionValue(0);
  const anchorKey = anchorIds.join("|");

  const measure = useCallback(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const narrow = vw < 700;
    unitRef.current = Math.min(1.5, Math.max(0.5, Math.min(vw, vh * 1.5) / 880));
    const els = anchorKey.split("|").map((id) => document.getElementById(id));
    const keys: number[] = [];
    const poses: Pose[] = [];
    els.forEach((el, i) => {
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      keys.push(i === 0 ? 0 : Math.max(0, top - vh * 0.55));
      poses.push(poseFor(i, els.length, narrow));
    });
    for (let k = 1; k < keys.length; k++) if (keys[k] <= keys[k - 1]) keys[k] = keys[k - 1] + 1;
    if (keys.length) {
      keysRef.current = keys;
      posesRef.current = poses;
    }
    tick.set(tick.get() + 1);
  }, [anchorKey, tick]);

  useEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      ro.disconnect();
    };
  }, [measure]);

  // Pointer response: a small, springy tilt on top of the scroll rotation.
  const pxRaw = useMotionValue(0);
  const pyRaw = useMotionValue(0);
  const px = useSpring(pxRaw, { stiffness: 60, damping: 18 });
  const py = useSpring(pyRaw, { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (reduce) return;
    const on = (e: PointerEvent) => {
      pxRaw.set(e.clientX / window.innerWidth - 0.5);
      pyRaw.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [reduce, pxRaw, pyRaw]);

  const pose = useTransform([scrollY, tick], ([y]) =>
    sample(y as number, keysRef.current, posesRef.current),
  );
  const x = useTransform(pose, (p) => `${p.x}vw`);
  const yv = useTransform(pose, (p) => `${p.y}vh`);
  const scale = useTransform(pose, (p) => p.s * unitRef.current);
  const opacity = useTransform(pose, (p) => p.o);
  const ex = useTransform(pose, (p) => p.ex);
  const tilt = useTransform(pose, (p) => p.tilt);
  const rotY = useTransform([scrollY, px], ([s, p]) => (s as number) * 0.16 + (p as number) * 14);
  const rotX = useTransform(
    [scrollY, py],
    ([s, p]) => 8 + Math.sin((s as number) / 380) * 6 - (p as number) * 10,
  );
  const ringSpin = useTransform(scrollY, (s) => s * 0.28);

  // Authored media, when a slot is filled in. Video is scrubbed by scroll.
  const media = HOME_ASSETS["hero-scene"];
  const [failed, setFailed] = useState(false);
  const useMedia = media.kind !== "procedural" && !!media.src && !failed;
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!useMedia || media.kind !== "video" || reduce) return;
    return scrollY.on("change", (y) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      v.currentTime = Math.min(v.duration, (y / max) * v.duration);
    });
  }, [useMedia, media.kind, reduce, scrollY]);

  const sceneStyle = reduce
    ? undefined
    : ({ x, y: yv, scale, opacity, "--ex": ex } as unknown as MotionStyle);

  return (
    <div className="wm-scene-layer" role="img" aria-label={media.alt}>
      <div className="wm-scene-stage">
        <motion.div className="wm-scene" style={sceneStyle}>
          {useMedia ? (
            media.kind === "video" ? (
              <video
                ref={videoRef}
                className="wm-media"
                src={media.src ?? undefined}
                poster={media.poster ?? undefined}
                muted
                playsInline
                preload="metadata"
                onError={() => setFailed(true)}
              />
            ) : (
              <img
                className="wm-media"
                src={media.src ?? undefined}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
              />
            )
          ) : (
            <motion.div
              className="wm-world"
              style={reduce ? undefined : { rotateX: rotX, rotateY: rotY }}
            >
              <div className="wm-ringtilt">
                <motion.div className="wm-ringaxis" style={reduce ? undefined : { rotateX: tilt }}>
                  <motion.div style={reduce ? undefined : { rotateY: ringSpin }} className="wm-ringspin">
                    <Ring />
                  </motion.div>
                </motion.div>
              </div>
              <Crystal className="wm-crystal-a" />
              <Crystal className="wm-crystal-b" />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

/**
 * The refraction filters — the part that makes the glass *liquid*.
 *
 * A frosted surface only blurs what is behind it. Real glass also bends it:
 * the content behind a bar bows and slides as it passes under the edge. There
 * is no filter function for that, only an SVG displacement map, so the two
 * filters here do the work.
 *
 * `muis-lens` bends the **live backdrop**, so a song title scrolling under the
 * tab bar visibly breaks as it crosses it. It runs in two passes, because one
 * cannot do both halves of what glass does:
 *
 * - the **sweep** is a very low frequency, pushed hard. It is the thickness of
 *   the slab: broad, slow, and noticeably stronger vertically than
 *   horizontally, which is what makes a line of text slide as it enters the
 *   edge rather than merely wobble.
 * - the **break** is a finer field, pushed lightly. It is the chop on the
 *   light — the part the eye actually reads as "this is glass" rather than
 *   "this is a blur that moved".
 *
 * Order matters and is the order a slab works in: displace the already-frosted
 * backdrop, then let the fine pass cut across it. It is deliberately static —
 * an animated displacement over moving text is unreadable, and the filter is
 * re-evaluated on every frame of a scroll anyway.
 *
 * `muis-refract` bends a copy of the **scene** painted inside the panel, for
 * engines whose `backdrop-filter` cannot take a `url()`. It drifts slowly, and
 * only exists where the live version is unavailable, so the one piece of
 * continuous GPU work in the app is also the one least likely to be running.
 */
export function GlassDefs() {
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <svg aria-hidden className="pointer-events-none absolute size-0" focusable="false">
      <defs>
        {/*
          The live backdrop. The region reaches well past the bar on every side
          so content can be pulled in from outside it — the whole point is that
          what is bending is not what is inside the bar.
        */}
        <filter
          id="muis-lens"
          x="-18%"
          y="-70%"
          width="136%"
          height="240%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.003 0.014"
            numOctaves={1}
            seed={5}
            result="sweep"
          />
          {/* Softening before displacing turns a hard static into a slow swell. */}
          <feGaussianBlur in="sweep" stdDeviation="2.2" result="sweepSoft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="sweepSoft"
            scale={30}
            xChannelSelector="R"
            yChannelSelector="G"
            result="bent"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.021 0.046"
            numOctaves={2}
            seed={17}
            result="grain"
          />
          <feGaussianBlur in="grain" stdDeviation="1.1" result="grainSoft" />
          <feDisplacementMap
            in="bent"
            in2="grainSoft"
            scale={14}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="muis-refract"
          x="-15%"
          y="-40%"
          width="130%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.014"
            numOctaves={2}
            seed={7}
            result="noise"
          >
            {motion && (
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.008 0.014;0.013 0.008;0.008 0.014"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="1.1" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale={18}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

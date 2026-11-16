import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";

/* ─── Spring Physics Engine (adapted from DesignBookmark / Motion Studies) ─── */

interface Spring {
  x: number; // current position
  v: number; // velocity
  t: number; // target position
  k: number; // stiffness
  c: number; // damping
}

const mkSpring = (x: number, k = 400, c = 30): Spring => ({
  x,
  v: 0,
  t: x,
  k,
  c,
});

const stepSpring = (s: Spring, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

const isSettled = (s: Spring, eps = 0.08) =>
  Math.abs(s.x - s.t) < eps && Math.abs(s.v) < eps;

/* ─── Reduced Motion Preference ─── */

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

/* ─── Types ─── */

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Optional badge (e.g. a counter) displayed alongside the label */
  badge?: React.ReactNode;
  /** Optional icon displayed before the label */
  icon?: React.ReactNode;
}

export interface SpringSegmentedControlProps<V extends string> {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Background color for the segmented track */
  trackBg: string;
  /** Active highlight pill background color */
  activeBg: string;
  /** Active option text color */
  activeText: string;
  /** Inactive option text color */
  inactiveText: string;
  /** Optional badge colors */
  activeBadgeBg?: string;
  activeBadgeText?: string;
  inactiveBadgeBg?: string;
  inactiveBadgeText?: string;
  /** Container CSS classes */
  className?: string;
  /** Individual button CSS classes */
  buttonClassName?: string;
  /** Accessibility ARIA label */
  ariaLabel?: string;
  /** Accessibility role (default: "group", or "tablist") */
  role?: "group" | "tablist";
  /** Pill border-radius (default: 9999px) */
  pillRadius?: number | string;
  /** Custom inline styles on container */
  style?: React.CSSProperties;
}

/* ─── Segmented Control Component ─── */

export function SpringSegmentedControl<V extends string>({
  options,
  value,
  onChange,
  trackBg,
  activeBg,
  activeText,
  inactiveText,
  activeBadgeBg,
  activeBadgeText,
  inactiveBadgeBg,
  inactiveBadgeText,
  className = "",
  buttonClassName = "",
  ariaLabel,
  role = "group",
  pillRadius = 9999,
  style,
}: SpringSegmentedControlProps<V>) {
  const reduceMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Find active option index
  const activeIdx = useMemo(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  // Motion tokens matching the reference's leading/trailing spring behavior
  const LEAD_K = 620;
  const LEAD_C = 36;
  const TRAIL_K = 190;
  const TRAIL_C = 19;

  const springsRef = useRef<{
    left: Spring;
    right: Spring;
    initialized: boolean;
    prevIdx: number;
    top: number;
    height: number;
  } | null>(null);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Measure button relative to container using unscaled layout offsets
  const measure = useCallback(
    (idx: number): { left: number; top: number; width: number; height: number } | null => {
      const container = containerRef.current;
      const btn = btnRefs.current[idx];
      if (!container || !btn) return null;

      if (btn.offsetParent === container) {
        return {
          left: btn.offsetLeft,
          top: btn.offsetTop,
          width: btn.offsetWidth,
          height: btn.offsetHeight,
        };
      }

      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      return {
        left: bRect.left - cRect.left,
        top: bRect.top - cRect.top,
        width: bRect.width,
        height: bRect.height,
      };
    },
    []
  );

  const snapPill = useCallback((left: number, top: number, width: number, height: number) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
    pill.style.width = `${width.toFixed(2)}px`;
    pill.style.height = `${height.toFixed(2)}px`;
    pill.style.opacity = "1";
  }, []);

  // Set up or update spring targets when active index changes
  useEffect(() => {
    let cancelled = false;

    const updateTargets = () => {
      if (cancelled) return;
      const rect = measure(activeIdx);
      if (!rect || rect.width === 0) {
        requestAnimationFrame(updateTargets);
        return;
      }

      const springs = springsRef.current;
      if (!springs || !springs.initialized) {
        springsRef.current = {
          left: mkSpring(rect.left, LEAD_K, LEAD_C),
          right: mkSpring(rect.left + rect.width, LEAD_K, LEAD_C),
          initialized: true,
          prevIdx: activeIdx,
          top: rect.top,
          height: rect.height,
        };
        snapPill(rect.left, rect.top, rect.width, rect.height);
        return;
      }

      springs.top = rect.top;
      springs.height = rect.height;

      const dir = activeIdx > springs.prevIdx ? 1 : activeIdx < springs.prevIdx ? -1 : 0;
      springs.prevIdx = activeIdx;

      if (reduceMotion) {
        springs.left.x = springs.left.t = rect.left;
        springs.left.v = 0;
        springs.right.x = springs.right.t = rect.left + rect.width;
        springs.right.v = 0;
        snapPill(rect.left, rect.top, rect.width, rect.height);
        return;
      }

      // Leading edge moves with stiffer spring (LEAD_K, LEAD_C)
      // Trailing edge lags with softer spring (TRAIL_K, TRAIL_C), creating elastic stretch
      if (dir >= 0) {
        springs.right.k = LEAD_K;
        springs.right.c = LEAD_C;
        springs.left.k = TRAIL_K;
        springs.left.c = TRAIL_C;
      } else {
        springs.left.k = LEAD_K;
        springs.left.c = LEAD_C;
        springs.right.k = TRAIL_K;
        springs.right.c = TRAIL_C;
      }

      springs.left.t = rect.left;
      springs.right.t = rect.left + rect.width;

      // Start animation loop
      startAnimation();
    };

    updateTargets();

    return () => {
      cancelled = true;
    };
  }, [activeIdx, measure, reduceMotion, snapPill]);

  // Spring animation loop
  const startAnimation = useCallback(() => {
    if (reduceMotion) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = 0;

    const animate = (now: number) => {
      const springs = springsRef.current;
      if (!springs || !springs.initialized) return;

      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000, 1 / 30);
      lastTimeRef.current = now;

      // Sub-step for numerical stability
      const sub = 4;
      for (let i = 0; i < sub; i++) {
        stepSpring(springs.left, dt / sub);
        stepSpring(springs.right, dt / sub);
      }

      const pill = pillRef.current;
      if (pill) {
        const minW = Math.max(12, springs.height * 0.7);
        const l = Math.min(springs.left.x, springs.right.x - minW);
        const w = Math.max(springs.right.x - l, minW);
        pill.style.transform = `translate3d(${l.toFixed(2)}px, ${springs.top.toFixed(2)}px, 0)`;
        pill.style.width = `${w.toFixed(2)}px`;
        pill.style.height = `${springs.height.toFixed(2)}px`;
        pill.style.opacity = "1";
      }

      if (!isSettled(springs.left) || !isSettled(springs.right)) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to exact target positions upon settling
        springs.left.x = springs.left.t;
        springs.right.x = springs.right.t;
        if (pill) {
          const finalW = springs.right.t - springs.left.t;
          pill.style.transform = `translate3d(${springs.left.t.toFixed(2)}px, ${springs.top.toFixed(2)}px, 0)`;
          pill.style.width = `${finalW.toFixed(2)}px`;
        }
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [reduceMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Handle container and font resizing
  useEffect(() => {
    const handleRealign = () => {
      const springs = springsRef.current;
      if (!springs || !springs.initialized) return;
      const rect = measure(activeIdx);
      if (!rect || rect.width === 0) return;

      springs.left.x = springs.left.t = rect.left;
      springs.left.v = 0;
      springs.right.x = springs.right.t = rect.left + rect.width;
      springs.right.v = 0;
      springs.top = rect.top;
      springs.height = rect.height;

      snapPill(rect.left, rect.top, rect.width, rect.height);
    };

    window.addEventListener("resize", handleRealign);

    // Support font readiness (from reference)
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(handleRealign);
    }

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(handleRealign);
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleRealign);
      if (observer) observer.disconnect();
    };
  }, [activeIdx, measure, snapPill]);

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      className={`relative inline-flex items-center ${className}`}
      style={{ backgroundColor: trackBg, ...style }}
    >
      {/* Spring-animated sliding highlight pill */}
      <div
        ref={pillRef}
        aria-hidden="true"
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          backgroundColor: activeBg,
          borderRadius: pillRadius,
          opacity: 0,
          willChange: "transform, width, height",
        }}
      />

      {/* Segment options */}
      {options.map((opt, i) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-[1] cursor-pointer ${buttonClassName}`}
            style={{
              backgroundColor: "transparent",
              color: isActive ? activeText : inactiveText,
              transition: reduceMotion
                ? "none"
                : "color 180ms cubic-bezier(0.2, 0, 0, 1), transform 180ms cubic-bezier(0.2, 0, 0, 1)",
            }}
            {...(role === "tablist"
              ? { role: "tab", "aria-selected": isActive }
              : {})}
          >
            {opt.icon && opt.icon}
            {opt.badge !== undefined ? (
              <>
                <span className="truncate">{opt.label}</span>
                <span
                  className="px-1 sm:px-1.5 py-0.5 leading-none rounded-full text-[10px] sm:text-[10.5px] font-bold tabular-nums shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? activeBadgeBg || "rgba(255, 255, 255, 0.22)"
                      : inactiveBadgeBg || "transparent",
                    color: isActive
                      ? activeBadgeText || activeText
                      : inactiveBadgeText || inactiveText,
                    transition: reduceMotion
                      ? "none"
                      : "background-color 180ms ease, color 180ms ease",
                  }}
                >
                  {opt.badge}
                </span>
              </>
            ) : (
              opt.label
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SpringSegmentedControl;

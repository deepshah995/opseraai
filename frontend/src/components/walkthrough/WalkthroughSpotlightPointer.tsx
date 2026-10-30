"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface SpotlightTarget {
  targetId: string;
  label: string;
  position?: "auto" | "top" | "bottom" | "left" | "right";
  durationMs?: number;
  timestamp?: number;
}

interface WalkthroughSpotlightPointerProps {
  spotlight: SpotlightTarget | null;
  onDismiss?: () => void;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const WalkthroughSpotlightPointer: React.FC<WalkthroughSpotlightPointerProps> = ({
  spotlight,
  onDismiss,
}) => {
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [resolvedPos, setResolvedPos] = useState<"top" | "bottom" | "left" | "right">("top");
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  const measureElement = useCallback((targetId: string): boolean => {
    const el = document.getElementById(targetId);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;

    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right,
    });

    const prefPos = spotlight?.position || "auto";
    if (prefPos !== "auto") {
      setResolvedPos(prefPos);
    } else {
      // If element is placed near top of viewport (< 140px), place pointer below target pointing up
      if (r.top < 140) {
        setResolvedPos("bottom");
      } else {
        setResolvedPos("top");
      }
    }
    return true;
  }, [spotlight]);

  useEffect(() => {
    if (!spotlight || !spotlight.targetId) {
      setIsVisible(false);
      setRect(null);
      return;
    }

    setIsVisible(true);
    setIsFading(false);

    let attempts = 0;
    const maxAttempts = 30;
    let active = true;

    const poll = () => {
      if (!active) return;
      const found = measureElement(spotlight.targetId);
      if (found) {
        // Track for the next 1.2s during smooth scroll
        let trackFrames = 50;
        const track = () => {
          if (!active) return;
          measureElement(spotlight.targetId);
          if (trackFrames-- > 0) {
            animFrameRef.current = requestAnimationFrame(track);
          }
        };
        animFrameRef.current = requestAnimationFrame(track);
      } else if (attempts++ < maxAttempts) {
        setTimeout(poll, 50);
      }
    };

    poll();

    const handleUpdate = () => {
      if (spotlight.targetId) {
        measureElement(spotlight.targetId);
      }
    };

    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });

    const duration = spotlight.durationMs || 5000;
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, Math.max(1000, duration - 600));

    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setRect(null);
      onDismiss?.();
    }, duration);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [spotlight, measureElement, onDismiss]);

  if (!isVisible || !rect) return null;

  const targetX = rect.left + rect.width / 2;
  const leftClamp = 260;
  const rightClamp = typeof window !== "undefined" ? window.innerWidth - 180 : 800;

  let badgeShiftX = 0;
  if (targetX < leftClamp) badgeShiftX = leftClamp - targetX;
  if (targetX > rightClamp) badgeShiftX = rightClamp - targetX;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Target Pulsing Highlight Ring */}
      <div
        style={{
          position: "fixed",
          top: `${Math.max(0, rect.top - 4)}px`,
          left: `${Math.max(0, rect.left - 4)}px`,
          width: `${rect.width + 8}px`,
          height: `${rect.height + 8}px`,
        }}
        className="rounded-xl border-2 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.55)] animate-pulse pointer-events-none"
      />

      {/* Floating Arrow & Indicator Bubble */}
      {resolvedPos === "top" ? (
        <div
          style={{
            position: "fixed",
            top: `${Math.max(48, rect.top - 58)}px`,
            left: `${targetX}px`,
            transform: "translateX(-50%)",
          }}
          className="flex flex-col items-center pointer-events-none"
        >
          {/* Bubble Badge */}
          <div 
            style={{ transform: `translateX(${badgeShiftX}px)` }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-white border border-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.45)] backdrop-blur-md whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="text-[11px] font-bold tracking-wide text-white">
              {spotlight?.label}
            </span>
          </div>
          {/* Downward Arrow */}
          <div className="-mt-1 text-blue-500 animate-arrow-down">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.85)]"
            >
              <path d="M12 21l-8-9h5V3h6v9h5l-8 9z" />
            </svg>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            top: `${rect.bottom + 8}px`,
            left: `${targetX}px`,
            transform: "translateX(-50%)",
          }}
          className="flex flex-col items-center pointer-events-none"
        >
          {/* Upward Arrow */}
          <div className="-mb-1 text-blue-500 animate-arrow-up">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="drop-shadow-[0_-2px_8px_rgba(59,130,246,0.85)]"
            >
              <path d="M12 3l8 9h-5v9h-6v-9h-5l8-9z" />
            </svg>
          </div>
          {/* Bubble Badge */}
          <div 
            style={{ transform: `translateX(${badgeShiftX}px)` }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-white border border-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.45)] backdrop-blur-md whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="text-[11px] font-bold tracking-wide text-white">
              {spotlight?.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

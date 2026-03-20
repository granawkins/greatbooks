"use client";

import { useCallback, useEffect, useRef } from "react";
import { scrollToCenter } from "@/lib/readingCenter";

const STABILIZE_STEPS_MS = [0, 16, 100, 300];

export function useReadingPositionController({
  enabled,
  isTextMode,
  getTarget,
  onSettled,
}: {
  enabled: boolean;
  isTextMode: boolean;
  getTarget: () => HTMLElement | null;
  onSettled?: () => void;
}) {
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const recenterNow = useCallback(() => {
    const el = getTarget();
    if (!el) return;
    scrollToCenter(el, "instant", isTextMode);
  }, [getTarget, isTextMode]);

  const stabilize = useCallback(() => {
    clearTimers();
    STABILIZE_STEPS_MS.forEach((delay, idx) => {
      const id = window.setTimeout(() => {
        recenterNow();
        if (idx === STABILIZE_STEPS_MS.length - 1) onSettled?.();
      }, delay);
      timersRef.current.push(id);
    });
  }, [clearTimers, recenterNow, onSettled]);

  useEffect(() => {
    if (!enabled) return;
    stabilize();
    return clearTimers;
  }, [enabled, stabilize, clearTimers]);

  useEffect(() => {
    if (!enabled) return;
    const onRecenterEvent = () => stabilize();
    const vv = window.visualViewport;
    window.addEventListener("resize", onRecenterEvent);
    vv?.addEventListener("resize", onRecenterEvent);
    vv?.addEventListener("scroll", onRecenterEvent);
    document.addEventListener("visibilitychange", onRecenterEvent);
    return () => {
      window.removeEventListener("resize", onRecenterEvent);
      vv?.removeEventListener("resize", onRecenterEvent);
      vv?.removeEventListener("scroll", onRecenterEvent);
      document.removeEventListener("visibilitychange", onRecenterEvent);
    };
  }, [enabled, stabilize]);

  return { recenterNow, stabilize };
}


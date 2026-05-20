"use client";

// RoomPoller — keeps all players in sync by calling router.refresh()
// - Polls every 2500ms normally, 1500ms during active gameplay
// - Immediately refreshes when you switch back to the tab (visibility change)
// - Pauses polling when tab is hidden to save resources
// - Uses startTransition so polling re-renders don't block user interactions

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

interface Props {
  intervalMs?: number;
}

export default function RoomPoller({ intervalMs = 2500 }: Props) {
  const router     = useRouter();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefresh = useRef<number>(0);
  const MIN_INTERVAL = 1000; // never refresh faster than 1s

  const doRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefresh.current < MIN_INTERVAL) return;
    lastRefresh.current = now;
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    function startPolling() {
      if (intervalId.current) return;
      intervalId.current = setInterval(() => {
        if (!document.hidden) doRefresh();
      }, intervalMs);
    }

    function stopPolling() {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    }

    function onVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        doRefresh();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doRefresh, intervalMs]);

  return null;
}

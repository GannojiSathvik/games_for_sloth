"use client";

// RoomPoller — keeps all players in sync by calling router.refresh()
// - Polls every 1500ms during active gameplay
// - Immediately refreshes when you switch back to the tab (visibility change)
// - Pauses polling when tab is hidden to save resources

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intervalMs?: number;
}

export default function RoomPoller({ intervalMs = 1500 }: Props) {
  const router     = useRouter();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function startPolling() {
      if (intervalId.current) return;
      intervalId.current = setInterval(() => {
        if (!document.hidden) router.refresh();
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
        // Immediately refresh when tab becomes visible again
        router.refresh();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}

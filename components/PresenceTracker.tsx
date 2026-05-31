"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible component that tracks the current user's online presence.
 * Sends a heartbeat to /api/presence every 30 seconds.
 * Marks user offline on unmount or page close.
 */
export default function PresenceTracker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/presence", { method: "POST" });
      } catch {
        // Silently fail — presence is best-effort
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up periodic heartbeat every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Mark offline on page close
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during page unload
      navigator.sendBeacon("/api/presence", JSON.stringify({ offline: true }));
    };

    // Also handle visibility change (tab hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        fetch("/api/presence", { method: "DELETE" }).catch(() => {});
      } else {
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Mark offline on unmount
      fetch("/api/presence", { method: "DELETE" }).catch(() => {});
    };
  }, []);

  // This component renders nothing
  return null;
}

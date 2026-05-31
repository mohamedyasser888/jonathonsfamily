"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  is_read: boolean;
}

interface NotificationCenterProps {
  onOpenComposer: () => void;
}

export default function NotificationCenter({ onOpenComposer }: NotificationCenterProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) return;
        const messages: Message[] = await res.json();
        const unread = messages.filter(
          (m) => m.sender_id === null && !m.is_read
        ).length;
        if (isMounted) {
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-violet-950/40 to-zinc-900/40 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Messages</h3>
          <p className="text-sm text-zinc-400">
            {unreadCount > 0 ? (
              <>
                You have{" "}
                <span className="text-violet-400 font-semibold">{unreadCount}</span> new{" "}
                {unreadCount === 1 ? "message" : "messages"}
              </>
            ) : (
              "No new messages"
            )}
          </p>
        </div>
        <button
          onClick={onOpenComposer}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-violet-500/20"
        >
          Talk to Jonathan Family
        </button>
      </div>
    </div>
  );
}

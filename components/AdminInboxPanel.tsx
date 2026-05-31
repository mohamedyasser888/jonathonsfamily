"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

interface Message {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
}

interface AdminInboxPanelProps {
  selectedUser: User | null;
}

export default function AdminInboxPanel({ selectedUser }: AdminInboxPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const { toast } = useToast();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    if (!selectedUser) {
      if (messages.length !== 0) {
        setMessages([]);
      }
      return;
    }

    let isMounted = true;

    const fetchMessages = async () => {
      if (!selectedUser) return;
      try {
        const res = await fetch(`/api/messages?user_id=${selectedUser.id}`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        if (isMounted) {
          setMessages(data || []);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
    // Poll for new messages every 2 seconds
    refreshIntervalRef.current = setInterval(fetchMessages, 2000);
    return () => {
      isMounted = false;
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [selectedUser]);

  useEffect(() => {
    // Only auto-scroll to bottom when new messages arrive
    if (messages.length > previousMessageCount) {
      // Check if user is near bottom before auto-scrolling
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (isNearBottom) {
          scrollToBottom();
        } else {
          setShowScrollButton(true);
        }
      }
    }
    setPreviousMessageCount(messages.length);
  }, [messages]);

  async function fetchMessages() {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/messages?user_id=${selectedUser.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending || !selectedUser) return;

    setSending(true);
    try {
      console.log("[AdminInboxPanel] Selected user object:", selectedUser);
      console.log("[AdminInboxPanel] Selected user ID:", selectedUser.id);
      console.log("[AdminInboxPanel] Selected user ID type:", typeof selectedUser.id);
      console.log("[AdminInboxPanel] Message content:", reply.trim());

      if (!selectedUser.id) {
        console.error("[AdminInboxPanel] Error: selectedUser.id is missing");
        toast("User ID is missing. Please select a user again.", "error");
        setSending(false);
        return;
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          content: reply.trim(),
        }),
      });

      console.log("[AdminInboxPanel] Response status:", res.status);
      console.log("[AdminInboxPanel] Response ok:", res.ok);

      const data = await res.json();
      console.log("[AdminInboxPanel] Response data:", data);

      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setReply("");
      toast("Message sent!", "success");
      await fetchMessages();
    } catch (err) {
      console.error("[AdminInboxPanel] Error sending message:", err);
      const message = err instanceof Error ? err.message : "Failed to send message";
      toast(message, "error");
    } finally {
      setSending(false);
    }
  }

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        <p>Select a user to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          {selectedUser.avatar_url ? (
            <img
              src={selectedUser.avatar_url}
              alt={selectedUser.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-violet-600/30"></div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              {selectedUser.username || selectedUser.email}
            </h3>
            <p className="text-xs text-zinc-500">
              {selectedUser.is_online ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>Online
                </span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromAdmin = msg.sender_id === null;
            return (
              <div
                key={msg.id}
                className={`flex ${isFromAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    isFromAdmin
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-700 text-zinc-100"
                  }`}
                >
                  <p className="text-sm font-semibold">{msg.sender_name}</p>
                  <p className="text-sm mt-1">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => {
              scrollToBottom();
              setShowScrollButton(false);
            }}
            className="absolute bottom-4 right-4 w-10 h-10 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
            title="Scroll to bottom"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-900/80">
        <form onSubmit={handleSendReply} className="flex gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

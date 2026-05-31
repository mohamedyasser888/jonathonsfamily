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

export default function UserInboxPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 2 seconds
    refreshIntervalRef.current = setInterval(fetchMessages, 2000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: null,
          content: reply.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setReply("");
      toast("Message sent!", "success");
      await fetchMessages();
    } catch (err) {
      console.error("Error sending message:", err);
      toast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-[600px] bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <p>No messages yet. Start a conversation with Jonathon Family!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isFromAdmin = msg.sender_id === null;
            return (
              <div
                key={msg.id}
                className={`flex ${isFromAdmin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    isFromAdmin
                      ? "bg-violet-600/20 border border-violet-500/30 text-zinc-100"
                      : "bg-zinc-700 text-zinc-100"
                  }`}
                >
                  <p className="text-sm font-semibold text-violet-400">{msg.sender_name}</p>
                  <p className="text-sm mt-1">{msg.content}</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
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

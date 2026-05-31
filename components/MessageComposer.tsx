"use client";

import { useState } from "react";

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

/**
 * Modal overlay for composing a new message to Jonathon Family (admin).
 * Animated entrance, glassmorphism styling.
 */
export default function MessageComposer({ isOpen, onClose, onSent }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSend() {
    if (!content.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: null,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      setContent("");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSent?.();
      }, 1500);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm msg-composer-backdrop" />

      {/* Modal */}
      <div className="relative w-full max-w-md msg-composer-modal">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl shadow-2xl shadow-violet-500/5 overflow-hidden">
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-zinc-800/60">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
                  <span className="text-sm font-black text-white">J</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Talk to Jonathon Family</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Send a message to the team</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 msg-composer-success">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L9 17L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-emerald-400">Message sent!</p>
                <p className="text-[11px] text-zinc-500">We&apos;ll get back to you soon</p>
              </div>
            ) : (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  rows={4}
                  autoFocus
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/40 resize-none transition-colors"
                />
                <p className="text-[10px] text-zinc-600 mt-2">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px]">Shift+Enter</kbd> for new line
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!content.trim() || sending}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-violet-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Send message
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

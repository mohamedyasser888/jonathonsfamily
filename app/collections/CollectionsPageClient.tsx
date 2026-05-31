"use client";

import { useState, ReactNode, useEffect } from "react";
import NotificationCenter from "@/components/NotificationCenter";
import UserInboxPanel from "@/components/UserInboxPanel";
import MessageComposer from "@/components/MessageComposer";
import PresenceTracker from "@/components/PresenceTracker";
import { useToast } from "@/components/Toast";

interface CollectionsPageClientProps {
  children: ReactNode;
}

export default function CollectionsPageClient({ children }: CollectionsPageClientProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"collections" | "inbox">("collections");

  return (
    <div className="space-y-8">
      {/* Presence Tracker - invisible but tracks user online status */}
      <PresenceTracker />

      {/* Message Composer Modal */}
      <MessageComposer isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} />

      {/* Notification Center */}
      <NotificationCenter onOpenComposer={() => setIsComposerOpen(true)} />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("collections")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "collections"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Collections
        </button>
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "inbox"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Inbox
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "collections" && <div>{children}</div>}
      {activeTab === "inbox" && <UserInboxPanel />}
    </div>
  );
}

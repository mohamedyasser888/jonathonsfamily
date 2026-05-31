"use client";

import { useState, useEffect, useRef } from "react";

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string | null;
}

interface UserListSidebarProps {
  onSelectUser: (user: User) => void;
  selectedUserId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function UserListSidebar({
  onSelectUser,
  selectedUserId,
  isOpen = true,
  onToggle,
}: UserListSidebarProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        if (isMounted) {
          setUsers(data || []);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();
    // Refresh user list every 5 seconds
    refreshIntervalRef.current = setInterval(fetchUsers, 5000);
    return () => {
      isMounted = false;
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  const filteredUsers = users.filter((user) =>
    (user.username || user.email).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineUsers = filteredUsers.filter((u) => u.is_online);
  const offlineUsers = filteredUsers.filter((u) => !u.is_online);

  return (
    <div
      className={`${
        isOpen ? "w-full sm:w-80" : "w-0"
      } transition-all duration-300 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ←
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-violet-500"></div>
          </div>
        ) : (
          <>
            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase">
                  Online ({onlineUsers.length})
                </div>
                {onlineUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={`w-full px-4 py-3 text-left border-b border-zinc-800 hover:bg-zinc-800 transition-colors ${
                      selectedUserId === user.id ? "bg-zinc-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-600/30"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.username || user.email}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Offline Users */}
            {offlineUsers.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase">
                  Offline ({offlineUsers.length})
                </div>
                {offlineUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={`w-full px-4 py-3 text-left border-b border-zinc-800 hover:bg-zinc-800 transition-colors ${
                      selectedUserId === user.id ? "bg-zinc-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover opacity-50"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700/30"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-400 truncate">
                          {user.username || user.email}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">offline</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredUsers.length === 0 && !loading && (
              <div className="flex items-center justify-center h-32 text-zinc-500">
                <p>No users found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type UserPresence = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
};

export type Conversation = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_online: boolean;
};

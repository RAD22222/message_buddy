export interface UserPublic {
  id: string;
  username: string;
  name: string;
  color: string;
  lastSeen?: string | Date;
}

export interface MessageWithSender {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  createdAt: string;
  read: boolean;
  sender: UserPublic;
  tempId?: string;
}

export interface ConversationPreview {
  id: string;
  updatedAt: string;
  otherUser: UserPublic;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

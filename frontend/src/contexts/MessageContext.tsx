import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ConversationSummary, Message } from '../api/types';
import { fetchConversations, connectMessageSocket, sendMessage, fetchConversationMessages, markConversationRead } from '../api/messages';
import toast from 'react-hot-toast';

interface MessageContextValue {
  conversations: ConversationSummary[];
  activeConversationId?: number;
  messages: Message[];
  loadingMessages: boolean;
  unreadTotal: number;
  openNewMessage: () => void;
  isNewMessageOpen: boolean;
  selectConversation: (id: number) => void;
  send: (recipientUserId: number, content: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

export const useMessageContext = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('MessageContext not found');
  return ctx;
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  async function refreshConversations() {
    const data = await fetchConversations();
    setConversations(data);
    const total = data.reduce((sum, c) => sum + c.unread_count, 0);
    setUnreadTotal(total);
  }

  async function loadMessages(id: number) {
    setLoadingMessages(true);
    try {
      const resp = await fetchConversationMessages(id, 0, 200);
      setMessages(resp.messages);
      await markConversationRead(id);
      await refreshConversations();
    } finally {
      setLoadingMessages(false);
    }
  }

  function selectConversation(id: number) {
    setActiveConversationId(id);
    loadMessages(id);
  }

  function openNewMessage() {
    setIsNewMessageOpen(true);
  }

  async function send(recipientUserId: number, content: string) {
    try {
      const msg = await sendMessage(recipientUserId, content);
      if (activeConversationId === msg.conversation_id) {
        setMessages((prev) => [...prev, msg]);
      }
      await refreshConversations();
    } catch (e: any) {
      toast.error(e?.message || '发送失败');
      throw e;
    }
  }

  useEffect(() => {
    refreshConversations();
    wsRef.current = connectMessageSocket((msg) => {
      // 收到新消息，刷新会话列表
      refreshConversations();
      if (msg.conversation_id === activeConversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => {
      wsRef.current?.close();
    };
  }, [activeConversationId]);

  return (
    <MessageContext.Provider value={{ conversations, activeConversationId, messages, loadingMessages, unreadTotal, selectConversation, send, refreshConversations, openNewMessage, isNewMessageOpen }}>
      {children}
    </MessageContext.Provider>
  );
};

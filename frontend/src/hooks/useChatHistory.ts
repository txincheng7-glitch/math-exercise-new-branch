// src/hooks/useChatHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid'; // 需要安装 uuid: npm install uuid @types/uuid

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export const useChatHistory = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const getStorageKey = useCallback(() => user ? `agent_conversations_${user.id}` : null, [user]);

  // 加载所有对话
  useEffect(() => {
    const key = getStorageKey();
    if (key) {
      const storedData = localStorage.getItem(key);
      if (storedData) {
        const loadedConversations: Conversation[] = JSON.parse(storedData);
        setConversations(loadedConversations);
        // 默认激活第一个，如果没有则不激活
        setActiveConversationId(loadedConversations[0]?.id || null);
      } else {
        // 如果没有历史，创建一个新的
        createNewConversation();
      }
    } else {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [user]); // 依赖 user 即可，createNewConversation 是稳定的

  // 保存所有对话
  const saveConversations = useCallback((updatedConversations: Conversation[]) => {
    const key = getStorageKey();
    if (key) {
      localStorage.setItem(key, JSON.stringify(updatedConversations));
    }
  }, [getStorageKey]);

  // 创建新对话
  const createNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: '新的对话',
      messages: [],
    };
    setConversations(prev => {
      const newConversations = [newConversation, ...prev];
      saveConversations(newConversations);
      return newConversations;
    });
    setActiveConversationId(newConversation.id);
  }, [saveConversations]);

  // 切换对话
  const selectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  // 删除对话
  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const newConversations = prev.filter(c => c.id !== id);
      saveConversations(newConversations);
      // 如果删除的是当前对话，激活第一个或清空
      if (activeConversationId === id) {
        setActiveConversationId(newConversations[0]?.id || null);
      }
      return newConversations;
    });
  };
  
  // 重命名对话
  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => {
        const newConversations = prev.map(c => 
            c.id === id ? { ...c, title: newTitle } : c
        );
        saveConversations(newConversations);
        return newConversations;
    });
  }, [saveConversations]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // 添加消息到当前对话
  const addMessage = useCallback((message: ChatMessage) => {
    if (!activeConversationId) return;

    setConversations(prev => {
      const newConversations = prev.map(c => {
        if (c.id === activeConversationId) {
          // 如果是新对话的第一条用户消息，用它来命名
          const isNewChat = c.title === '新的对话' && c.messages.length === 0 && message.role === 'user';
          const newTitle = isNewChat ? message.content.substring(0, 20) : c.title;

          return {
            ...c,
            title: newTitle,
            messages: [...c.messages, message],
          };
        }
        return c;
      });
      saveConversations(newConversations);
      return newConversations;
    });
  }, [activeConversationId, saveConversations]);
  
  // 更新消息
  const updateMessage = useCallback((messageIndex: number, newContent: string) => {
    if (!activeConversationId) return;

    setConversations(prev => {
        const newConversations = prev.map(c => {
            if (c.id === activeConversationId) {
                const newMessages = [...c.messages];
                newMessages[messageIndex].content = newContent;
                return { ...c, messages: newMessages };
            }
            return c;
        });
        saveConversations(newConversations);
        return newConversations;
    });
  }, [activeConversationId, saveConversations]);

  // 删除消息
  const deleteMessage = useCallback((messageIndex: number) => {
    if (!activeConversationId) return;

    setConversations(prev => {
        const newConversations = prev.map(c => {
            if (c.id === activeConversationId) {
                const newMessages = c.messages.filter((_, index) => index !== messageIndex);
                return { ...c, messages: newMessages };
            }
            return c;
        });
        saveConversations(newConversations);
        return newConversations;
    });
  }, [activeConversationId, saveConversations]);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    selectConversation,
    createNewConversation,
    deleteConversation,
    renameConversation,
    addMessage,
    updateMessage,
    deleteMessage,
  };
};

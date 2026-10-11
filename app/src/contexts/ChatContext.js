import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { getTotalUnreadCount, markMessagesAsRead } from '../services/chatService';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChatId, setActiveChatId] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!profile?.id) {
      setUnreadCount(0);
      return;
    }
    const count = await getTotalUnreadCount(profile.id);
    setUnreadCount(count);
  }, [profile?.id]);

  useEffect(() => {
    // Initial fetch and subscription setup
    setTimeout(() => fetchUnreadCount(), 0);

    if (!profile?.id) return;

    // Subscribe to new messages globally via Realtime
    const channel = supabase
      .channel('global-chat-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const { new: message } = payload;
          if (message.sender_id !== profile.id && message.chat_id !== activeChatId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, activeChatId, fetchUnreadCount]);

  const updateActiveChat = useCallback(async (chatId) => {
    setActiveChatId(chatId);
    if (chatId && profile?.id) {
      // Ensure mark as read completes before refreshing count
      const success = await markMessagesAsRead(chatId, profile.id);
      if (success) {
        fetchUnreadCount();
      }
    }
  }, [profile?.id, fetchUnreadCount]);

  const value = useMemo(() => ({
    unreadCount,
    fetchUnreadCount,
    activeChatId,
    updateActiveChat
  }), [unreadCount, fetchUnreadCount, activeChatId, updateActiveChat]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

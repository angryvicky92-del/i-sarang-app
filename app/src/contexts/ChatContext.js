import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  }, [profile]);

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          // If any message in the system was marked as read, refresh our count
          if (payload.new.is_read) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, activeChatId, fetchUnreadCount]);

  const updateActiveChat = async (chatId) => {
    setActiveChatId(chatId);
    if (chatId && profile?.id) {
      // Ensure mark as read completes before refreshing count
      const success = await markMessagesAsRead(chatId, profile.id);
      if (success) {
        fetchUnreadCount();
      }
    }
  };

  return (
    <ChatContext.Provider value={{ unreadCount, fetchUnreadCount, activeChatId, updateActiveChat }}>
      {children}
    </ChatContext.Provider>
  );
};

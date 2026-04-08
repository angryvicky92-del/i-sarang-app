import { supabase } from './supabaseClient';

/**
 * Get all conversations for a specific user
 */
export const getConversations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        user1:profiles!user1_id(id, nickname, user_type),
        user2:profiles!user2_id(id, nickname, user_type),
        unread_count:chat_messages(id)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('chat_messages.is_read', false)
      .neq('chat_messages.sender_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      // Fallback if is_read column missing: try without the unread filter
      if (error.message?.includes('is_read')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('chats')
          .select(`
            *,
            user1:profiles!user1_id(id, nickname, user_type),
            user2:profiles!user2_id(id, nickname, user_type)
          `)
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .order('updated_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map(chat => ({ ...chat, unread_count: 0 }));
      }
      throw error;
    }
    
    // Map the unread_count array to its length
    return (data || []).map(chat => ({
      ...chat,
      unread_count: chat.unread_count?.length || 0
    }));
  } catch (error) {
    if (!error.message?.includes('is_read')) {
      console.error('Error fetching conversations:', error.message);
    }
    return [];
  }
};

/**
 * Get messages for a specific chat
 */
export const getMessages = async (chatId) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    return [];
  }
};

/**
 * Send a message
 */
export const sendMessage = async (chatId, senderId, content) => {
  try {
    // 1. Insert message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        { chat_id: chatId, sender_id: senderId, content, is_read: false }
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. Update chat's last_message and updated_at
    await supabase
      .from('chats')
      .update({ last_message: content, updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return data;
  } catch (error) {
    console.error('Error sending message:', error.message);
    return null;
  }
};

/**
 * Get or create a chat between two users
 */
export const getOrCreateChat = async (user1Id, user2Id) => {
  try {
    const [u1, u2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .eq('user1_id', u1)
      .eq('user2_id', u2)
      .maybeSingle();

    if (existing) return existing.id;

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert([{ user1_id: u1, user2_id: u2 }])
      .select('id')
      .single();

    if (createError) throw createError;
    return newChat.id;
  } catch (error) {
    console.error('Error in getOrCreateChat:', error.message);
    return null;
  }
};

/**
 * Subscribe to new messages in a chat
 */
export const subscribeToMessages = (chatId, onNewMessage) => {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();
};

/**
 * Get total unread messages count for a user across all chats
 */
export const getTotalUnreadCount = async (userId) => {
  try {
    const { data: conversations } = await supabase
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    
    if (!conversations || conversations.length === 0) return 0;
    
    const chatIds = conversations.map(c => c.id);
    
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('chat_id', chatIds)
      .eq('is_read', false)
      .neq('sender_id', userId);
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    // If the error is about 'is_read' column missing, just return 0 without crashing/logging full error
    if (error.message?.includes('is_read')) {
      return 0;
    }
    console.error('Error fetching total unread count:', error.message);
    return 0;
  }
};

/**
 * Mark all messages in a chat as read by the current user
 */
export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error marking messages as read (Chat: ${chatId}, User: ${userId}):`, error);
    return false;
  }
};

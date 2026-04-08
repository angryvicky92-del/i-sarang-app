import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useChat } from '../contexts/ChatContext';
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import { ChevronLeft, Send, User } from 'lucide-react-native';

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, otherUser } = route.params;
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { updateActiveChat, fetchUnreadCount } = useChat();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Set this room as active and mark existing messages as read
    const initChat = async () => {
      updateActiveChat(chatId);
      if (profile?.id) {
        await markMessagesAsRead(chatId, profile.id);
        fetchUnreadCount();
      }
    };
    
    initChat();
    fetchMessages();
    
    const subscription = subscribeToMessages(chatId, async (newMessage) => {
      // If we receive a message while in the room, mark it as read in the DB
      if (newMessage.sender_id !== profile?.id) {
        await markMessagesAsRead(chatId, profile?.id);
        fetchUnreadCount(); // Refresh global badge instantly
      }

      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      // Deactivate this room on unmount and do a final refresh of the badge
      updateActiveChat(null);
      fetchUnreadCount();
      subscription.unsubscribe();
    };
  }, [chatId, fetchMessages, updateActiveChat, profile?.id, fetchUnreadCount]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getMessages(chatId);
      setMessages(data || []);
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setLoading(false);
    }
  }, [chatId]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    
    try {
      const result = await sendMessage(chatId, profile.id, text);
      if (result) {
        setMessages(prev => {
            if (prev.some(m => m.id === result.id)) return prev;
            return [...prev, result];
        });
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [inputText, sending, chatId, profile?.id]);

  const renderMessageItem = ({ item }) => {
    const isMine = item.sender_id === profile?.id;
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMine && (
          <View style={[styles.avatarSmall, { backgroundColor: isDarkMode ? colors.card : '#F1F5F9' }]}>
            <User size={16} color={colors.primary} />
          </View>
        )}
        <View style={styles.messageBubbleContainer}>
          {!isMine && <Text style={[styles.senderNickname, { color: colors.textSecondary }]}>{otherUser?.nickname || '익명'}</Text>}
          <View style={[
            styles.bubble, 
            isMine ? [styles.myBubble, { backgroundColor: colors.primary }] : [styles.otherBubble, { backgroundColor: colors.card, borderColor: colors.border }]
          ]}>
            <Text style={[styles.messageText, { color: isMine ? '#FFF' : colors.text }]}>{item.content}</Text>
          </View>
          <Text style={[styles.messageTime, { color: colors.textMuted }, isMine && { textAlign: 'right' }]}>{time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{otherUser?.nickname || '익명'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxHeight={100}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: colors.primary }, !inputText.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 16, paddingBottom: 24 },
  messageRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 12 },
  messageBubbleContainer: { maxWidth: '75%' },
  senderNickname: { fontSize: 12, marginBottom: 4, marginLeft: 4 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 0.5 },
  myBubble: { borderBottomRightRadius: 2, borderColor: 'transparent' },
  otherBubble: { borderBottomLeftRadius: 2 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

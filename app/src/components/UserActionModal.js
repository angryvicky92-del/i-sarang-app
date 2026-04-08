import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { MessageSquare, User, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function UserActionModal({ visible, onClose, onChat, nickname, userType }) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.header}>
                <View style={styles.userInfo}>
                  <Text style={[styles.nickname, { color: colors.text }]}>{nickname || '익명'}</Text>
                  {userType && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{userType}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.options}>
                <TouchableOpacity 
                  style={[styles.optionItem, { borderBottomColor: colors.border }]} 
                  onPress={() => {
                    onChat();
                    onClose();
                  }}
                >
                  <MessageSquare size={20} color={colors.primary} />
                  <Text style={[styles.optionText, { color: colors.text }]}>채팅하기</Text>
                </TouchableOpacity>

                {/* Future options like "View Profile" can go here */}
                {/* 
                <TouchableOpacity style={styles.optionItem} onPress={onClose}>
                  <User size={20} color={colors.textSecondary} />
                  <Text style={[styles.optionText, { color: colors.text }]}>프로필 보기</Text>
                </TouchableOpacity> 
                */}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  options: {
    gap: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

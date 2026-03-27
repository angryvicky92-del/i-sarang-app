import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

export default function CenterBottomSheet({ daycare, onClose }) {
  const snapPoints = useMemo(() => ['25%', '50%'], []);
  let index = daycare ? 1 : -1;

  if (!daycare) return null;

  return (
    <BottomSheet
      index={index}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{daycare.name}</Text>
        <Text style={styles.info}>정원: {daycare.capacity}명 / 대기: {daycare.waitingCount}명</Text>
        <Text style={styles.info}>교사수: {daycare.teacherCount}명</Text>
        <Text style={styles.info}>관할기관: {daycare.office}</Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  info: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  }
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

const RatingStars = ({ rating, size = 16, color = '#FACC15', maxStars = 5 }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 1; i <= maxStars; i++) {
    if (i <= fullStars) {
      stars.push(
        <Star key={i} size={size} color={color} fill={color} />
      );
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars.push(
        <View key={i} style={{ position: 'relative', width: size, height: size }}>
          <Star size={size} color="#E2E8F0" fill="transparent" />
          <View style={{ position: 'absolute', top: 0, left: 0, width: size / 2, overflow: 'hidden' }}>
            <Star size={size} color={color} fill={color} />
          </View>
        </View>
      );
    } else {
      stars.push(
        <Star key={i} size={size} color="#E2E8F0" fill="transparent" />
      );
    }
  }

  return (
    <View style={styles.container}>
      {stars}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

export default RatingStars;

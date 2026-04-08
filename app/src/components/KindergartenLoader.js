import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { Building2 } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

const KindergartenLoader = () => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.2, { damping: 2 }),
        withSpring(1, { damping: 2 })
      ),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(5, { duration: 400 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ]
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={animatedStyle}>
        <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Image source={require('../../assets/custom_icon.png')} style={{ width: 100, height: 100, resizeMode: 'contain' }} />
        </View>
      </Animated.View>
      <View style={styles.dots}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  iconCircle: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 } 
  },
  text: { 
    fontSize: 18, 
    fontWeight: '900', 
    textAlign: 'center', 
    marginBottom: 4 
  },
  subText: { 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  dots: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10 
  }
});

export default KindergartenLoader;

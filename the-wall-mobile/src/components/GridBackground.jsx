import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 20;

export default function GridBackground() {
  const horizontalLines = Math.ceil(SCREEN_HEIGHT / GRID_SIZE);
  const verticalLines = Math.ceil(SCREEN_WIDTH / GRID_SIZE);

  return (
    <View style={styles.container}>
      {/* Yatay çizgiler */}
      {[...Array(horizontalLines)].map((_, i) => (
        <View
          key={`h-${i}`}
          style={[
            styles.horizontalLine,
            { top: i * GRID_SIZE }
          ]}
        />
      ))}
      
      {/* Dikey çizgiler */}
      {[...Array(verticalLines)].map((_, i) => (
        <View
          key={`v-${i}`}
          style={[
            styles.verticalLine,
            { left: i * GRID_SIZE }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1a1a1a',
    opacity: 0.3,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1a1a1a',
    opacity: 0.3,
  },
});
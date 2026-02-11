import React, { useEffect, useState, useMemo } from 'react';
import {
  View, StyleSheet, Dimensions, Text, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar
} from 'react-native';
import { Canvas, Points } from "@shopify/react-native-skia";
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import socket from '../services/socket';
import { COLOR_PALETTE } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_SIZE = 100;
const COOLDOWN_TIME = 10;
const BASE_PIXEL_SIZE = 28;

export default function CanvasView({ nickname }) {
  const [canvasData, setCanvasData] = useState(null);
  const [selectedColor, setSelectedColor] = useState(2);
  const [timeLeft, setTimeLeft] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  
  // --- ZOOM & PAN STATES ---
  const [viewOffset, setViewOffset] = useState({ x: 10, y: 10 });
  const [scale, setScale] = useState(1.0);

  // --- DİNAMİK HESAPLAMALAR ---
  const currentPixelSize = BASE_PIXEL_SIZE * scale;
  const visibleCols = Math.floor(SCREEN_WIDTH / currentPixelSize);
  const visibleRows = Math.floor((SCREEN_HEIGHT * 0.55) / currentPixelSize);
  const canvasPxWidth = currentPixelSize * visibleCols;
  const canvasPxHeight = currentPixelSize * visibleRows;

  // --- 🖐️ GESTURE HANDLER (ZOOM + PAN) ---
  
  // 1. Kaydırma (Pan)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const deltaX = Math.round(e.translationX / currentPixelSize);
      const deltaY = Math.round(e.translationY / currentPixelSize);
      
      // Sadece belli bir eşiği geçince state güncelle (performans için)
      if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
        setViewOffset(prev => {
          let newX = Math.max(0, Math.min(CANVAS_SIZE - visibleCols, prev.x - (e.velocityX > 0 ? 1 : -1)));
          let newY = Math.max(0, Math.min(CANVAS_SIZE - visibleRows, prev.y - (e.velocityY > 0 ? 1 : -1)));
          return { x: newX, y: newY };
        });
      }
    })
    .runOnJS(true);

  // 2. İki Parmak Zoom (Pinch)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = scale * e.scale;
      // Zoom sınırları: 0.4x - 4.0x
      if (newScale >= 0.4 && newScale <= 4.0) {
        setScale(newScale);
      }
    })
    .runOnJS(true);

  // İkisini birleştir
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // --- SOCKET & TIMER (Aynı) ---
  useEffect(() => {
    socket.emit('request_canvas');
    socket.on('init_canvas', (data) => setCanvasData(new Uint8Array(data)));
    socket.on('pixel_changed', ({ x, y, colorIndex }) => {
      setCanvasData(prev => {
        if (!prev) return prev;
        const copy = new Uint8Array(prev);
        copy[y * CANVAS_SIZE + x] = colorIndex;
        return copy;
      });
    });
    socket.on('user_count', (count) => setOnlineCount(count));
    return () => { socket.off('init_canvas'); socket.off('pixel_changed'); socket.off('user_count'); };
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // --- RENDER LOGIC ---
  const visiblePoints = useMemo(() => {
    if (!canvasData) return [];
    const groups = new Map();
    for (let row = 0; row < visibleRows; row++) {
      for (let col = 0; col < visibleCols; col++) {
        const canvasX = viewOffset.x + col;
        const canvasY = viewOffset.y + row;
        if (canvasX < CANVAS_SIZE && canvasY < CANVAS_SIZE) {
          const colorIndex = canvasData[canvasY * CANVAS_SIZE + canvasX] || 0;
          if (!groups.has(colorIndex)) groups.set(colorIndex, []);
          groups.get(colorIndex).push({
            x: col * currentPixelSize + currentPixelSize / 2,
            y: row * currentPixelSize + currentPixelSize / 2,
          });
        }
      }
    }
    return Array.from(groups.entries()).map(([idx, pts]) => ({
      color: COLOR_PALETTE[idx] || "#FFFFFF",
      points: pts,
    }));
  }, [canvasData, viewOffset, scale]);

  const handlePaint = (event) => {
    if (timeLeft > 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const col = Math.floor(locationX / currentPixelSize);
    const row = Math.floor(locationY / currentPixelSize);
    const canvasX = viewOffset.x + col;
    const canvasY = viewOffset.y + row;

    if (canvasX < 0 || canvasX >= CANVAS_SIZE || canvasY < 0 || canvasY >= CANVAS_SIZE) return;

    setCanvasData(prev => {
      if (!prev) return prev;
      const copy = new Uint8Array(prev);
      copy[canvasY * CANVAS_SIZE + canvasX] = selectedColor;
      return copy;
    });
    setTimeLeft(COOLDOWN_TIME);
    socket.emit('paint_pixel', { x: canvasX, y: canvasY, colorIndex: selectedColor, nickname });
  };

  if (!canvasData) return <View style={styles.loading}><Text style={styles.loadingText}>SYNCING_PIXELS...</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ÜST HUD */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>THE_WALL // V2.0</Text>
          <Text style={styles.statusText}>{onlineCount} NODES ONLINE</Text>
        </View>
        <View style={[styles.timerBadge, timeLeft > 0 && styles.timerActive]}>
          <Text style={styles.timerText}>{timeLeft > 0 ? `WAIT: ${timeLeft}s` : 'READY'}</Text>
        </View>
      </View>

      <View style={styles.metricsBar}>
        <Text style={styles.metricsText}>COORD: {viewOffset.x},{viewOffset.y}</Text>
        <Text style={styles.metricsText}>ZOOM: {Math.round(scale * 100)}%</Text>
      </View>

      {/* GESTURE DETECTOR WRAPPER */}
      <View style={styles.canvasFrame}>
        <GestureDetector gesture={composedGesture}>
          <View
            style={[styles.canvasWrapper, { width: canvasPxWidth + 2, height: canvasPxHeight + 2 }]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handlePaint}
          >
            <Canvas style={{ width: canvasPxWidth, height: canvasPxHeight }} pointerEvents="none">
              {visiblePoints.map((group, idx) => (
                <Points
                  key={idx}
                  points={group.points}
                  mode="points"
                  color={group.color}
                  strokeWidth={currentPixelSize - 0.5} 
                />
              ))}
            </Canvas>
          </View>
        </GestureDetector>
      </View>

      {/* ALT PALET */}
      <View style={styles.dock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {COLOR_PALETTE.map((color, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedColor(index)}
              style={[styles.swatch, { backgroundColor: color }, selectedColor === index && styles.swatchActive]}
            />
          ))}
        </ScrollView>
      </View>
      <Text style={styles.hintText}>PINCH TO ZOOM • DRAG TO MOVE • TAP TO PAINT</Text>
    </SafeAreaView>
  );
}
//styles

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C10' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#161B22' },
  brandTitle: { color: '#ff00b3ff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },
  statusText: { color: '#3EFC4E', fontSize: 10, fontFamily: 'monospace' },
  timerBadge: { padding: 10, backgroundColor: '#000', borderWidth: 2, borderColor: '#FFE600' },
  timerActive: { borderColor: '#FF4500' },
  timerText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  metricsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 5 },
  metricsText: { color: '#555', fontSize: 10, fontFamily: 'monospace' },
  canvasFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvasWrapper: { backgroundColor: '#10121A', borderWidth: 1, borderColor: '#30363D', overflow: 'hidden' },
  dock: { padding: 15, backgroundColor: '#161B22', borderTopWidth: 2, borderTopColor: '#30363D' },
  scrollContent: { gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: 4, borderWidth: 1, borderColor: '#000' },
  swatchActive: { borderColor: '#FFF', borderWidth: 3, transform: [{ scale: 1.1 }] },
  hintText: { color: '#444', fontSize: 9, textAlign: 'center', paddingBottom: 10, backgroundColor: '#161B22' },
  loading: { flex: 1, backgroundColor: '#0A0C10', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00E5FF', fontFamily: 'monospace' }
});
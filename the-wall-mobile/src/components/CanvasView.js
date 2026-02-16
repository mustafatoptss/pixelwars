import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Canvas, Points } from "@shopify/react-native-skia";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import socket from "../services/socket";
import { COLOR_PALETTE } from "../constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
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
        setViewOffset((prev) => {
          let newX = Math.max(
            0,
            Math.min(
              CANVAS_SIZE - visibleCols,
              prev.x - (e.velocityX > 0 ? 1 : -1),
            ),
          );
          let newY = Math.max(
            0,
            Math.min(
              CANVAS_SIZE - visibleRows,
              prev.y - (e.velocityY > 0 ? 1 : -1),
            ),
          );
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
    socket.emit("request_canvas");
    socket.on("init_canvas", (data) => setCanvasData(new Uint8Array(data)));
    socket.on("pixel_changed", ({ x, y, colorIndex }) => {
      setCanvasData((prev) => {
        if (!prev) return prev;
        const copy = new Uint8Array(prev);
        copy[y * CANVAS_SIZE + x] = colorIndex;
        return copy;
      });
    });
    socket.on("user_count", (count) => setOnlineCount(count));
    return () => {
      socket.off("init_canvas");
      socket.off("pixel_changed");
      socket.off("user_count");
    };
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

    if (
      canvasX < 0 ||
      canvasX >= CANVAS_SIZE ||
      canvasY < 0 ||
      canvasY >= CANVAS_SIZE
    )
      return;

    setCanvasData((prev) => {
      if (!prev) return prev;
      const copy = new Uint8Array(prev);
      copy[canvasY * CANVAS_SIZE + canvasX] = selectedColor;
      return copy;
    });
    setTimeLeft(COOLDOWN_TIME);
    socket.emit("paint_pixel", {
      x: canvasX,
      y: canvasY,
      colorIndex: selectedColor,
      nickname,
    });
  };

  if (!canvasData)
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>SYNCING_PIXELS...</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ÜST HUD */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>PİXEL WAR</Text>
          <Text style={styles.statusText}>{onlineCount} NODES ONLINE</Text>
        </View>
        <View style={[styles.timerBadge, timeLeft > 0 && styles.timerActive]}>
          <Text style={styles.timerText}>
            {timeLeft > 0 ? `WAIT: ${timeLeft}s` : "READY"}
          </Text>
        </View>
      </View>

      <View style={styles.metricsBar}>
        <Text style={styles.metricsText}>
          COORD: {viewOffset.x},{viewOffset.y}
        </Text>
        <Text style={styles.metricsText}>ZOOM: {Math.round(scale * 100)}%</Text>
      </View>

      {/* GESTURE DETECTOR WRAPPER */}
      <View style={styles.canvasFrame}>
        <GestureDetector gesture={composedGesture}>
          <View
            style={[
              styles.canvasWrapper,
              { width: canvasPxWidth + 2, height: canvasPxHeight + 2 },
            ]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handlePaint}
          >
            <Canvas
              style={{ width: canvasPxWidth, height: canvasPxHeight }}
              pointerEvents="none"
            >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {COLOR_PALETTE.map((color, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedColor(index)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                selectedColor === index && styles.swatchActive,
              ]}
            />
          ))}
        </ScrollView>
      </View>
      <Text style={styles.hintText}>
        PINCH TO ZOOM • DRAG TO MOVE • TAP TO PAINT
      </Text>
    </SafeAreaView>
  );
}
//styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 4,
    borderBottomColor: "#6a4c93",
    borderTopWidth: 2,
    borderTopColor: "#16213e",
  },

  brandTitle: {
    color: "#ff6b9d",
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "monospace",
    textShadowColor: "#c9184a",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    letterSpacing: 2,
  },

  statusText: {
    color: "#4ecdc4",
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1,
    textShadowColor: "#1a535c",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },

  timerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#16213e",
    borderWidth: 4,
    borderColor: "#0f0f23",
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderTopColor: "#6a4c93",
    borderLeftColor: "#6a4c93",
  },

  timerActive: {
    backgroundColor: "#f72585",
    borderColor: "#b5179e",
    borderTopColor: "#ff8fab",
    borderLeftColor: "#ff8fab",
  },

  timerText: {
    color: "#ffeaa7",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "monospace",
    letterSpacing: 2,
    textShadowColor: "#2d3436",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },

  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#16213e",
    borderBottomWidth: 3,
    borderBottomColor: "#0f0f23",
    borderTopWidth: 1,
    borderTopColor: "#3a506b",
  },

  metricsText: {
    color: "#74b9ff",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "#0f0f23",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },

  canvasFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f23",
    padding: 24,
  },

  canvasWrapper: {
    backgroundColor: "#1a1a2e",
    borderWidth: 6,
    borderColor: "#6a4c93",
    borderBottomWidth: 9,
    borderRightWidth: 9,
    borderTopColor: "#b185db",
    borderLeftColor: "#b185db",
    overflow: "hidden",
    shadowColor: "#6a4c93",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
  },

  dock: {
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderTopWidth: 4,
    borderTopColor: "#6a4c93",
    borderBottomWidth: 2,
    borderBottomColor: "#16213e",
  },

  scrollContent: {
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  swatch: {
    width: 52,
    height: 52,
    borderRadius: 0,
    borderWidth: 4,
    borderColor: "#0f0f23",
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderTopColor: "#3a506b",
    borderLeftColor: "#3a506b",
  },

  swatchActive: {
    borderWidth: 5,
    borderColor: "#ffeaa7",
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: "#fdcb6e",
    borderLeftColor: "#fdcb6e",
    transform: [{ scale: 1.12 }],
    shadowColor: "#ffeaa7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },

  hintText: {
    color: "#4ecdc4",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 14,
    backgroundColor: "#1a1a2e",
    fontFamily: "monospace",
    letterSpacing: 1.2,
    fontWeight: "bold",
    textShadowColor: "#0f0f23",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },

  loading: {
    flex: 1,
    backgroundColor: "#0f0f23",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#ff6b9d",
    fontFamily: "monospace",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 3,
    textShadowColor: "#c9184a",
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
});

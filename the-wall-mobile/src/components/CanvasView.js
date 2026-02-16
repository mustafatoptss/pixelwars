import React, { useEffect, useState, useMemo, useRef } from "react";
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
import LeaderBoard from "./LeaderBoard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// --- KONTEYNER BOYUTLARI (SABİT) ---
const CONTAINER_WIDTH = SCREEN_WIDTH - 40;
const CONTAINER_HEIGHT = SCREEN_HEIGHT * 0.55;

const CANVAS_SIZE = 100;
const COOLDOWN_TIME = 10;
const BASE_PIXEL_SIZE = 28;

export default function CanvasView({ nickname, userId }) {
  const [canvasData, setCanvasData] = useState(null);
  const [selectedColor, setSelectedColor] = useState(2);
  const [timeLeft, setTimeLeft] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);

  // --- ZOOM & PAN STATES ---
  const [viewOffset, setViewOffset] = useState({ x: 10, y: 10 });
  const [scale, setScale] = useState(1.0);

  const startOffset = useRef({ x: 10, y: 10 });
  const startScale = useRef(1.0);

  // --- DİNAMİK HESAPLAMALAR ---
  const currentPixelSize = BASE_PIXEL_SIZE * scale;

  // Piksellerin kutuyu tam doldurması için konteyner boyutlarını baz alıyoruz
  const visibleCols = Math.ceil(CONTAINER_WIDTH / currentPixelSize);
  const visibleRows = Math.ceil(CONTAINER_HEIGHT / currentPixelSize);

  // --- 🖐️ GESTURE HANDLER ---

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startOffset.current = { x: viewOffset.x, y: viewOffset.y };
    })
    .onUpdate((e) => {
      const deltaX = Math.round(e.translationX / currentPixelSize);
      const deltaY = Math.round(e.translationY / currentPixelSize);

      // Sınırları visibleCols/Rows'a göre hesapla ki dışarı taşmasın veya siyahlık kalmasın
      const newX = Math.max(
        0,
        Math.min(CANVAS_SIZE - visibleCols, startOffset.current.x - deltaX),
      );
      const newY = Math.max(
        0,
        Math.min(CANVAS_SIZE - visibleRows, startOffset.current.y - deltaY),
      );

      if (newX !== viewOffset.x || newY !== viewOffset.y) {
        setViewOffset({ x: newX, y: newY });
      }
    })
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.current = scale;
    })
    .onUpdate((e) => {
      const newScale = Math.max(
        0.4,
        Math.min(4.0, startScale.current * e.scale),
      );
      if (newScale !== scale) {
        setScale(newScale);
      }
    })
    .runOnJS(true);

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // --- SOCKET & TIMER ---
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

    // visibleRows ve visibleCols kadar dönerek pikselleri yerleştiriyoruz
    // +1 ekleyerek tam sığmayan piksellerin yarım kalmasını önlüyoruz
    for (let row = 0; row <= visibleRows; row++) {
      for (let col = 0; col <= visibleCols; col++) {
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
  }, [canvasData, viewOffset, scale, visibleCols, visibleRows]);

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
      userId,
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

      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>THE WALL</Text>
          <Text style={styles.statusText}>{onlineCount} ONLINE</Text>
        </View>
      <View style={{marginLeft:50}}><LeaderBoard socket={socket} /></View>
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

      <View style={styles.canvasFrame}>
        <GestureDetector gesture={composedGesture}>
          <View
            style={[
              styles.canvasWrapper,
              { width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT },
            ]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handlePaint}
          >
            <Canvas style={{ flex: 1 }} pointerEvents="none">
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0f0f0f",
    borderBottomWidth: 3,
    borderBottomColor: "#ff006e",
  },
  brandTitle: {
    color: "#ff006e",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "monospace",
    letterSpacing: 3,
  },
  statusText: {
    color: "#0bd10eff",
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  timerBadge: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#333333",
  },
  timerActive: { borderColor: "#ff006e" },
  timerText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "monospace",
  },
  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#0a0a0a",
  },
  metricsText: {
    color: "#666666",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  canvasFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  canvasWrapper: {
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "#ff006e",
    overflow: "hidden",
    shadowColor: "#ff006e",
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
  dock: {
    padding: 16,
    backgroundColor: "#0f0f0f",
    borderTopWidth: 3,
    borderTopColor: "#ff006e",
  },
  scrollContent: { gap: 10, paddingHorizontal: 4, paddingVertical: 8 },
  swatch: { width: 44, height: 44, borderWidth: 2, borderColor: "#1a1a1a" },
  swatchActive: { borderColor: "#ff006e", transform: [{ scale: 1.1 }] },
  hintText: {
    marginBottom:20,
    color: "#666666",
    fontSize: 9,
    textAlign: "center",
    paddingVertical: 12,
    backgroundColor: "#0f0f0f",
  },
  loading: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#ff006e", fontSize: 18, fontWeight: "bold" },
});

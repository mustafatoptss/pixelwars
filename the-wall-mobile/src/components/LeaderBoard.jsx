import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
} from "react-native";

export default function LeaderBoard({ socket }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    socket.on("leaderboard_data", (leaderboardData) => {
      setData(leaderboardData);
    });
    return () => socket.off("leaderboard_data");
  }, [socket]);

  const openLeaderboard = () => {
    socket.emit("get_leaderboard");
    setModalVisible(true);
  };

  const getRankStyle = (index) => {
    if (index === 0) return { color: "#FFD700", textShadowColor: "#FFD700", textShadowRadius: 10 }; 
    if (index === 1) return { color: "#E0E0E0", textShadowColor: "#E0E0E0", textShadowRadius: 8 }; 
    if (index === 2) return { color: "#CD7F32", textShadowColor: "#CD7F32", textShadowRadius: 6 }; 
    return { color: "#666" }; 
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.cardRow}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, getRankStyle(index)]}>#{index + 1}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.nick} numberOfLines={1}>
          {item.nickname.toUpperCase()}
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{item.score}</Text>
        <Text style={styles.scoreUnit}>PX</Text>
      </View>
    </View>
  );

  return (
    <View>
      {/* ANA BUTON */}
      <TouchableOpacity style={styles.btnContainer} onPress={openLeaderboard}>
        <Text style={styles.btnIcon}>🏆</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          {/* Arkaya basınca kapatma alanı */}
          <TouchableOpacity 
            style={styles.overlayTouch} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          />
          
          <View style={styles.modalContainer}>
            {/* Üst Çizgi (Tutumacı) */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>TOP_LEGENDS</Text>
              <TouchableOpacity 
                style={styles.closeBtnContainer} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeBtn}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            {/* Başlıklar */}
            <View style={styles.listHeader}>
              <Text style={[styles.listHeaderTitle, { width: 40 }]}>RANK</Text>
              <Text style={[styles.listHeaderTitle, { flex: 1, paddingLeft: 10 }]}>PLAYER</Text>
              <Text style={[styles.listHeaderTitle, { textAlign: 'right' }]}>SCORE</Text>
            </View>

            {/* Liste */}
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>SYNCING_DATA...</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- BUTON ---
  btnContainer: {
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#0bd10eff",
    width: 44,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0bd10eff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  btnIcon: {
    fontSize: 20,
  },

  // --- MODAL DIŞ YAPI ---
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  overlayTouch: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#ff006e", // Neon Pembe Çerçeve
    height: "75%",
    paddingHorizontal: 25, // **ARADIĞIN PADDING BURADA**
    paddingTop: 15,
    shadowColor: "#ff006e",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  
  // --- SÜSLEMELER ---
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  // --- HEADER ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#ff006e",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "monospace",
    letterSpacing: 2,
    textShadowColor: "#ff006e",
    textShadowRadius: 8,
  },
  closeBtnContainer: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#666",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeBtn: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
    letterSpacing: 1,
  },

  // --- LİSTE BAŞLIKLARI ---
  listHeader: {
    flexDirection: "row",
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  listHeaderTitle: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
    letterSpacing: 1,
  },

  // --- LİSTE İÇERİĞİ ---
  listContent: {
    paddingBottom: 50, // En alttaki eleman safe area'ya girmesin
  },
  
  // --- KART TASARIMI (ROW) ---
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111", // Hafif bir arka plan
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8, // Kartlar arası boşluk
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 4, // Hafif köşe yumuşatma
  },
  rankContainer: {
    width: 40,
    alignItems: "flex-start",
  },
  rank: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  infoContainer: {
    flex: 1,
    paddingLeft: 5,
  },
  nick: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
    minWidth: 80,
  },
  score: {
    color: "#0bd10eff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    textShadowColor: "#0bd10eff",
    textShadowRadius: 5,
  },
  scoreUnit: {
    color: "#0bd10eff",
    fontSize: 10,
    marginLeft: 4,
    fontFamily: "monospace",
    opacity: 0.8,
  },

  // --- BOŞ DURUM ---
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "#444",
    fontSize: 14,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
});
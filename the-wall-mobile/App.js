import "react-native-reanimated";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Paintbrush } from "lucide-react-native";

// 1. ADIM: Yazdığımız CanvasView'ı içeri aktar kanka
import CanvasView from "./src/components/CanvasView";
import GridBackground from "./src/components/GridBackground";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  const [nickname, setNickname] = useState("");
  const [tempName, setTempName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const savedName = await AsyncStorage.getItem("user_nickname");
    if (savedName) setNickname(savedName);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (tempName.trim().length > 2) {
      await AsyncStorage.setItem("user_nickname", tempName);
      setNickname(tempName);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <GridBackground />
        <ActivityIndicator color="#ff006e" size="large" />
      </View>
    );
  }

  // GİRİŞ EKRANI (Grid background ekledim)
  if (!nickname) {
    return (
      <View style={styles.container}>
        <GridBackground />
        
        <View style={styles.header}>
          <Paintbrush color="#ff006e" size={48} strokeWidth={2} />
          <Text style={styles.title}>THE WALL</Text>
          <Text style={styles.subtitle}>v1.0.0-stable</Text>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Takma adını belirle..."
            placeholderTextColor="#333333"
            value={tempName}
            onChangeText={setTempName}
            maxLength={15}
          />
          <TouchableOpacity style={styles.button} onPress={handleJoin}>
            <Text style={styles.buttonText}>DUVARA KATIL</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          1 piksel / 10 saniye. İzini bırak.
        </Text>
      </View>
    );
  }

  // 2. ADIM: Canvas ekranı
  return (
    <GestureHandlerRootView>
      <View style={{ flex: 1, backgroundColor: "#0a0a0a"}}>
        <CanvasView nickname={nickname} />

        {/* Temaya uyumlu debug butonu */}
        <TouchableOpacity
          onPress={() => {
            AsyncStorage.clear();
            setNickname("");
          }}
          style={styles.debugBtn}
        >
          <Text style={styles.debugBtnText}>CHANGE NAME</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  debugBtn: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#0f0f0f",
    borderWidth: 2,
    borderColor: "#333333",
    borderRadius: 0,
  },
  
  debugBtnText: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  
  header: {
    alignItems: "center",
    marginBottom: 50,
    zIndex: 1,
  },
  
  title: {
    color: "#ff006e",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 5,
    marginTop: 10,
    fontFamily: "monospace",
    textShadowColor: "#ff006e",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  
  subtitle: {
    color: "#666666",
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginTop: 8,
  },
  
  inputCard: {
    width: "100%",
    backgroundColor: "#0f0f0f",
    padding: 28,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: "#1a1a1a",
    zIndex: 1,
  },
  
  input: {
    color: "#ffffff",
    borderBottomWidth: 2,
    borderBottomColor: "#333333",
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 18,
    marginBottom: 28,
    textAlign: "center",
    fontFamily: "monospace",
    fontWeight: "bold",
    backgroundColor: "#0a0a0a",
  },
  
  button: {
    backgroundColor: "#ff006e",
    padding: 18,
    borderRadius: 0,
    alignItems: "center",
    borderWidth: 0,
    shadowColor: "#ff006e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  
  buttonText: {
    color: "#ffffff",
    fontWeight: "900",
    letterSpacing: 3,
    fontSize: 16,
    fontFamily: "monospace",
  },
  
  footerNote: {
    color: "#666666",
    fontSize: 10,
    position: "absolute",
    bottom: 40,
    fontFamily: "monospace",
    letterSpacing: 2,
    zIndex: 1,
  },
});
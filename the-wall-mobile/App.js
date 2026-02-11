import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paintbrush } from 'lucide-react-native';

// 1. ADIM: Yazdığımız CanvasView'ı içeri aktar kanka
import CanvasView from './src/components/CanvasView'; 
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [nickname, setNickname] = useState('');
  const [tempName, setTempName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const savedName = await AsyncStorage.getItem('user_nickname');
    if (savedName) setNickname(savedName);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (tempName.trim().length > 2) {
      await AsyncStorage.setItem('user_nickname', tempName);
      setNickname(tempName);
    }
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator color="#3B82F6" /></View>;
  }

  // GİRİŞ EKRANI (Aynı kalıyor)
  if (!nickname) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Paintbrush color="#3B82F6" size={48} strokeWidth={1.5} />
          <Text style={styles.title}>THE WALL</Text>
          <Text style={styles.subtitle}>v1.0.0-stable</Text>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Takma adını belirle..."
            placeholderTextColor="#64748b"
            value={tempName}
            onChangeText={setTempName}
            maxLength={15}
          />
          <TouchableOpacity style={styles.button} onPress={handleJoin}>
            <Text style={styles.buttonText}>DUVARA KATIL</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerNote}>1 piksel / 10 saniye. İzini bırak.</Text>
      </View>
    );
  }

  // 2. ADIM: BURAYI DEĞİŞTİRİYORUZ
  // Artık placeholder yazı yerine gerçek Canvas'ı çağırıyoruz.
  return (
<GestureHandlerRootView>
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
       <CanvasView nickname={nickname} />
       
       {/* Test için ismini sıfırlama butonu alt kısımda kalsın */}
       <TouchableOpacity 
          onPress={() => {AsyncStorage.clear(); setNickname('');}}
          style={styles.debugBtn}
       >
          <Text style={{color: '#475569', fontSize: 10}}>İSMİ SIFIRLA</Text>
       </TouchableOpacity>
    </View>
</GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Mevcut stillerine sadece bunu ekleyebilirsin
  debugBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    padding: 10
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 10,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 2,
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    color: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerNote: {
    color: '#475569',
    fontSize: 11,
    position: 'absolute',
    bottom: 40,
  }
});
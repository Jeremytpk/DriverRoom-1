
import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
// Jey: Import encryption library
import CryptoJS from 'crypto-js';

// Jey: The same key used for encryption. This is a security risk in production.
const ENCRYPTION_KEY = "Jertopak-98-61-80";

const GateCodeDetail = ({ route, navigation }) => {
  const { gateCodeId } = route.params;
  const [gateCode, setGateCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decryptedCode, setDecryptedCode] = useState('');

  useEffect(() => {
    const fetchGateCode = async () => {
      try {
        const docRef = doc(db, 'gateCodes', gateCodeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setGateCode(data);
          
          // Jey: Decrypt the code when fetching.
          const bytes = CryptoJS.AES.decrypt(data.encryptedCode, ENCRYPTION_KEY);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          setDecryptedCode(plaintext);

        } else {
          Alert.alert("Error", "Gate code not found.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Jey: Error fetching gate code details:", error);
        Alert.alert("Error", "Failed to load gate code details.");
      } finally {
        setLoading(false);
      }
    };

    fetchGateCode();
  }, [gateCodeId, navigation]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={styles.loadingText}>Loading gate code details...</Text>
      </View>
    );
  }

  if (!gateCode) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.loadingText}>Gate code not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gate Code Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.locationText}>{gateCode.location}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>DSP:</Text>
          <Text style={styles.detailValue}>{gateCode.dspName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gate Code:</Text>
          <Text style={styles.codeText}>{decryptedCode}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Notes:</Text>
          <Text style={styles.detailValue}>{gateCode.notes || 'N/A'}</Text>
        </View>
        {gateCode.imageUrl && (
          <Image source={{ uri: gateCode.imageUrl }} style={styles.gateImage} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 20,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6BB9F0',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 10,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5733',
  },
  gateImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#6BB9F0',
    padding: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default GateCodeDetail;
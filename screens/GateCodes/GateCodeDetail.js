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
  Alert,
  Platform, // Jey: Added Platform for web compatibility
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
          
          // Jey: Add error handling for bad decryption, just in case
          if (plaintext.length === 0) {
            setDecryptedCode('DECRYPTION ERROR');
            Alert.alert("Warning", "Failed to decrypt code. Check the encryption key.");
          } else {
            setDecryptedCode(plaintext);
          }

        } else {
          Alert.alert("Error", "Gate code not found.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Jey: Error fetching or decrypting gate code details:", error);
        Alert.alert("Error", "Failed to load or decrypt gate code details.");
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
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.locationText}>{gateCode.location}</Text>
        
        {/* Jey: Encrypted Code Block - Highly Visible */}
        <View style={styles.codeBlock}>
          <Text style={styles.codeBlockLabel}>GATE CODE (DECRYPTED)</Text>
          <Text selectable={true} style={styles.codeBlockValue}>
            {decryptedCode}
          </Text>
        </View>

        {/* DSP and Creation Info */}
        <View style={styles.detailGroup}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DSP Assigned:</Text>
            <Text style={styles.detailValue}>{gateCode.dspName || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created At:</Text>
            <Text style={styles.detailValue}>
              {gateCode.createdAt?.toDate().toLocaleDateString() || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Notes Section - Full Width for better reading */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesValue}>{gateCode.notes || 'No specific instructions provided.'}</Text>
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
    marginTop: Platform.OS === 'ios' ? 50 : 20, // Jey: Adjust for iOS status bar
    paddingHorizontal: 15,
  },
  headerBackButton: {
    padding: 5,
    ...Platform.select({ // Jey: Web hover for back button
      web: { cursor: 'pointer', transition: 'opacity 0.2s', ':hover': { opacity: 0.7 } },
    }),
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  locationText: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    color: '#6BB9F0',
    textAlign: 'center',
  },
  
  // --- Code Block Styles ---
  codeBlock: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9AA2',
    alignItems: 'center',
  },
  codeBlockLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 5,
  },
  codeBlockValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF5733', // Eye-catching, strong color
    letterSpacing: 2,
  },
  
  // --- Detail Group Styles ---
  detailGroup: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: 120, // Fixed width for alignment
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // --- Notes Styles ---
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  notesValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },

  gateImage: {
    width: '100%',
    height: 250, // Slightly taller image
    resizeMode: 'cover',
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
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
    ...Platform.select({ // Jey: Web hover for back button
      web: { cursor: 'pointer', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#5ca3e0' } },
    }),
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default GateCodeDetail;
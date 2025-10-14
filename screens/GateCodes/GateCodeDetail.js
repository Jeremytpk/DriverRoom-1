import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import CustomHeader from '../../components/CustomHeader';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ArrowRightShort from '../../assets/png/arrow_rightShort.png';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = "Jertopak-98-61-80";

const GateCodeDetail = ({ route, navigation }) => {
  const { gateCodeId } = route.params;
  const [gateCode, setGateCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decryptedCode, setDecryptedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    const fetchGateCode = async () => {
      try {
        const docRef = doc(db, 'gateCodes', gateCodeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGateCode(data);
          const bytes = CryptoJS.AES.decrypt(data.encryptedCode, ENCRYPTION_KEY);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
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

  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setModalImage(null);
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading gate code details...</Text>
        <Text style={styles.loadingSubText}>Decrypting secure information</Text>
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
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Removed old header View to prevent double headers */}
        <View style={styles.locationHeader}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={24} color="#007AFF" />
          </View>
          <Text style={styles.locationText}>{gateCode.location}</Text>
        </View>

        <View style={styles.contentCard}>
          {/* Image Section - now at the top */}
          {gateCode.imageUrl && (
            <View style={styles.imageCard}>
              <View style={styles.imageHeader}>
                <Ionicons name="image" size={18} color="#007AFF" />
                <Text style={styles.imageTitle}>Location Photo</Text>
              </View>
              <TouchableOpacity style={styles.imageContainer} onPress={() => openImageModal(gateCode.imageUrl)}>
                <Image source={{ uri: gateCode.imageUrl }} style={styles.gateImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="expand" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Secure Code Section */}
          <View style={styles.codeSection}>
            <View style={styles.codeSectionHeader}>
              <Ionicons name="key" size={20} color="#007AFF" />
              <Text style={styles.codeSectionTitle}>Access Code</Text>
            </View>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeLabel}>SECURE ACCESS CODE</Text>
              <TouchableOpacity style={styles.codeContainer}>
                <Text selectable={true} style={styles.codeValue}>
                  {decryptedCode}
                </Text>
                      <View style={styles.copyHint}>
                        <Ionicons name="copy-outline" size={16} color="#8E8E93" />
                        <Text style={styles.copyText}>Tap to select</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Information Cards */}
                <View style={styles.infoSection}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                      <Ionicons name="business" size={18} color="#007AFF" />
                      <Text style={styles.infoTitle}>Company Information</Text>
                    </View>
                    <Text style={styles.infoValue}>{gateCode.dspName || 'Not specified'}</Text>
                  </View>

                  <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                      <Ionicons name="calendar" size={18} color="#007AFF" />
                      <Text style={styles.infoTitle}>Date Added</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {gateCode.createdAt?.toDate().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) || 'Unknown'}
                    </Text>
                  </View>
                </View>

                {/* Notes Section */}
                {gateCode.notes && (
                  <View style={styles.notesCard}>
                    <View style={styles.notesHeader}>
                      <Ionicons name="document-text" size={18} color="#007AFF" />
                      <Text style={styles.notesTitle}>Additional Notes</Text>
                    </View>
                    <Text style={styles.notesContent}>{gateCode.notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeImageModal}>
          <View style={styles.modalContent}>
            {modalImage && (
              <Image source={{ uri: modalImage }} style={styles.modalImage} />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  
  // Loading Styles
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  loadingSubText: {
    marginTop: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  
  // Header Styles
  // header: fully removed, now handled by CustomHeader
  // headerBackButton: fully removed
  // headerTitle: fully removed
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  
  // Location Header
  locationHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  // Content Styles
  contentCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  
  // Code Section Styles
  codeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  codeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  codeDisplay: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: 1,
  },
  codeContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  codeValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 3,
    marginBottom: 12,
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Info Section Styles
  infoSection: {
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  
  // Notes Card Styles
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesContent: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
  },

  
  // Image Card Styles
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 20,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gateImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Back Button Styles
  backButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: { 
        cursor: 'pointer', 
        transition: 'background-color 0.2s', 
        ':hover': { backgroundColor: '#0056CC' } 
      },
    }),
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    maxWidth: '90%',
    maxHeight: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: 320,
    height: 320,
    resizeMode: 'contain',
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
  },
});

export default GateCodeDetail;
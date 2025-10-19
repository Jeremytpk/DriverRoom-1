import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import AddGateCodeModal from '../../components/AddGateCodeModal';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Ionicons } from '@expo/vector-icons';

const GateCodes = () => {
  const [gateCodes, setGateCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false); // image viewer modal
  const [modalImage, setModalImage] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [dsps, setDsps] = useState([]);
  const [search, setSearch] = useState('');
  const navigation = useNavigation();
  const { userData } = useAuth();

  // fetchGateCodes function so it can be reused after adding new code
  const fetchGateCodes = async () => {
    setLoading(true);
    try {
      const [codesSnap, companiesSnap] = await Promise.all([
        getDocs(collection(db, 'gateCodes')),
        getDocs(collection(db, 'companies')),
      ]);
      const codes = codesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const companies = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGateCodes(codes);
      setDsps(companies);
    } catch (error) {
      console.error('Error fetching gate codes or dsps:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateCodes();
  }, []);

  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setModalImage(null);
  };

  // Filter gate codes by search
  const filteredGateCodes = gateCodes.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      (item.location && item.location.toLowerCase().includes(searchLower)) ||
      (item.dspName && item.dspName.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading gate codes...</Text>
      </View>
    );
  }

  if (gateCodes.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#B0B0B0" style={{ marginBottom: 18, opacity: 0.7 }} />
        <Text style={styles.emptyText}>No gate codes found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location or company..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#B0B0B0"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        style={styles.container}
        data={filteredGateCodes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('GateCodeDetail', { gateCodeId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={22} color="#2E8B57" />
              </View>
              <Text style={styles.locationText}>{item.location || 'No Location'}</Text>
              {item.imageUrl && (
                <TouchableOpacity
                  style={styles.placeImageWrapper}
                  onPress={e => {
                    e.stopPropagation();
                    openImageModal(item.imageUrl);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.placeImage} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="business" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                <Text style={styles.infoValue}>{item.dspName || 'Not specified'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="calendar" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                <Text style={styles.infoValue}>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.centeredContainer}>
            <Ionicons name="search" size={48} color="#B0B0B0" style={{ marginBottom: 12, opacity: 0.7 }} />
            <Text style={styles.emptyText}>No results found.</Text>
          </View>
        )}
      />
      {/* Floating Add Button (always visible) */}
      <TouchableOpacity
        style={styles.fab}
        accessibilityLabel="Add gate code"
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            {/* Use AddGateCodeModal component instead of raw image modal */}
            {/* We'll lazy-load the component to avoid circular imports at top */}
            {/* existing image modal retained for image preview within list */}
            {modalImage && (
              <Image source={{ uri: modalImage }} style={styles.modalImage} />
            )}
          </View>
        </Pressable>
      </Modal>
      {/* Add Gate Code Modal component loaded at bottom to avoid layout overlap */}
      <AddGateCodeModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={() => {
          // refresh list after saving
          setAddModalVisible(false);
          fetchGateCodes();
        }}
        currentDspName={userData?.dspName}
        userDspId={userData?.companyId || userData?.dspUserId || userData?.uid}
        dsps={dsps}
        isAdmin={!!userData?.isAdmin}
      />
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
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptyText: {
    fontSize: 17,
    color: '#888',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  placeImageWrapper: {
    marginLeft: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  placeImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
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
  infoSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  separator: {
    height: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E8B57',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },
});

export default GateCodes;

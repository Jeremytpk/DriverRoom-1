import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  Alert,
  Platform,
  ScrollView, 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import AddGateCodeModal from '../../components/AddGateCodeModal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const GateCodes = () => {
  const { userData, user } = useAuth();
  const navigation = useNavigation();
  const [gateCodes, setGateCodes] = useState([]);
  const [filteredGateCodes, setFilteredGateCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [dsps, setDsps] = useState([]);
  const [isDSPsLoading, setIsDSPsLoading] = useState(true);
  const [currentDspId, setCurrentDspId] = useState(null);
  const [isDataReady, setIsDataReady] = useState(false);
  
  // Jey: Flags defined but NOT used for deletion logic visibility/execution anymore.
  const isAdmin = userData?.role === 'admin';
  const isDsp = userData?.role === 'company'; 

  useEffect(() => {
    const fetchDspData = async () => {
      if (!userData?.dspName) {
        setIsDSPsLoading(false);
        return;
      }

      const dspsQuery = query(collection(db, 'users'), where('role', '==', 'company'));
      const querySnapshot = await getDocs(dspsQuery);
      const dspsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDsps(dspsList);
      
      if (!isAdmin) {
        const foundDsp = dspsList.find(dsp => dsp.name === userData.dspName);
        if (foundDsp) {
          setCurrentDspId(foundDsp.id);
        } else {
          console.error("Jey: Could not find company document for dspName:", userData.dspName);
        }
      } else {
        console.log("Jey: Logged in as an admin. DSP list is ready.");
      }

      setIsDSPsLoading(false);
    };

    fetchDspData();
  }, [userData?.role, userData?.dspName, isAdmin]);

  useEffect(() => {
    if (!userData?.dspName && !isAdmin) {
      setLoading(false);
      return;
    }
    
    let gateCodesQuery;
    if (isAdmin) {
      gateCodesQuery = query(
        collection(db, 'gateCodes'),
        orderBy('createdAt', 'desc')
      );
    } else {
      gateCodesQuery = query(
        collection(db, 'gateCodes'),
        where('dspName', '==', userData.dspName),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(gateCodesQuery, (snapshot) => {
      const codes = [];
      snapshot.forEach((doc) => {
        codes.push({ id: doc.id, ...doc.data() });
      });
      setGateCodes(codes);
      setFilteredGateCodes(codes);
      setLoading(false);
    }, (error) => {
      console.error("Jey: Error fetching gate codes: ", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load gate codes.");
    });

    return () => unsubscribe();
  }, [userData?.dspName, isAdmin]);

  useEffect(() => {
    const isNonAdminDataReady = isDsp && !loading && !isDSPsLoading && currentDspId;
    const isAdminDataReady = isAdmin && !loading && !isDSPsLoading;

    if (isNonAdminDataReady || isAdminDataReady) {
      setIsDataReady(true);
    }
  }, [loading, isDSPsLoading, currentDspId, isAdmin, isDsp]);

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredGateCodes(gateCodes);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = gateCodes.filter(code =>
        code.location.toLowerCase().includes(lowerCaseQuery) ||
        (code.notes && code.notes.toLowerCase().includes(lowerCaseQuery)) ||
        (code.dspName && code.dspName.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredGateCodes(filtered);
    }
  }, [searchQuery, gateCodes]);

  const handleAddGateCode = () => {
    if (!isDataReady) {
        Alert.alert("Please Wait", "Loading DSP information. Please try again in a moment.");
        return;
    }
    setIsAddModalVisible(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalVisible(false);
  };

  const handleGateCodeSaved = () => {
    setIsAddModalVisible(false);
  };

  const handleImageClick = (imageUrl) => {
    setCurrentImageUri(imageUrl);
    setIsImageViewerVisible(true);
  };

  const handleImageViewerClose = () => {
    setIsImageViewerVisible(false);
    setCurrentImageUri(null);
  };

  const deleteGateCode = async (codeId) => {
    // Jey: REMOVED ALL FRONT-END ROLE/PERMISSION CHECKS HERE.
    
    Alert.alert(
      "Delete Gate Code",
      "Are you sure you want to delete this gate code? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'gateCodes', codeId));
            } catch (error) {
              console.error("Jey: Error deleting gate code:", error);
              // The error here might be "Permission Denied" if Firebase rules block it.
              Alert.alert("Error", "Failed to delete gate code. Please check permissions.");
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  const handleViewDetails = (gateCodeId) => {
    navigation.navigate('GateCodeDetail', { gateCodeId });
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.codeCard}
      onPress={() => handleViewDetails(item.id)}
    >
      <TouchableOpacity
        style={styles.cardImageContainer}
        onPress={() => item.imageUrl && handleImageClick(item.imageUrl)}
        disabled={!item.imageUrl}
      >
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/gate.png')}
          style={styles.cardImage}
        />
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        <Text style={styles.location}>{item.location}</Text>
        <Text style={styles.code}>Status: Encrypted</Text> 
        {item.dspName && <Text style={styles.dspName}>Added by: {item.dspName}</Text>}
      </View>
      
      <View style={styles.cardActions}>
        {/* Jey: REMOVED VISIBILITY CONDITION - BUTTON IS ALWAYS RENDERED */}
        <TouchableOpacity
          style={styles.deleteIconContainer}
          onPress={() => deleteGateCode(item.id)} 
        >
          <Ionicons name="trash-outline" size={24} color="#DC3545" />
        </TouchableOpacity>
        
        <Ionicons name="chevron-forward" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );


  if (loading || isDSPsLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={styles.loadingText}>Loading gate codes...</Text>
      </View>
    );
  }
  
  return (
    // Outer View uses the main container style
    <View style={styles.container}>
      
      {/* Jey's Fix: Conditional rendering to remove TouchableWithoutFeedback on Web */}
      {Platform.OS !== 'web' ? (
        // Mobile/Native Logic: Use TWB for keyboard dismissal
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {/* Inner view required to apply flex: 1 within TWB */}
          <View style={{ flex: 1 }}>
            
            <TextInput
              style={styles.searchBar}
              placeholder="Search by address, notes, or DSP..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
            />

            {filteredGateCodes.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No matching gate codes found.' : 'No gate codes found for your DSP.'}
                </Text>
                {!searchQuery && <Text style={styles.emptyStateSubText}>Tap the "+" button to add the first code!</Text>}
                {searchQuery && <Text style={styles.emptyStateSubText}>Try a different search term or add a new gate code.</Text>}
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredGateCodes.map(item => (
                    <View key={item.id}>
                        {renderItem({ item })}
                    </View>
                ))}
              </ScrollView>
            )}

          </View>
        </TouchableWithoutFeedback>
      ) : (
        // Web Logic: Render content directly (no TWB wrapper)
        <>
          <TextInput
            style={styles.searchBar}
            placeholder="Search by address, notes, or DSP..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />

          {filteredGateCodes.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No matching gate codes found.' : 'No gate codes found for your DSP.'}
              </Text>
              {!searchQuery && <Text style={styles.emptyStateSubText}>Tap the "+" button to add the first code!</Text>}
              {searchQuery && <Text style={styles.emptyStateSubText}>Try a different search term or add a new gate code.</Text>}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {filteredGateCodes.map(item => (
                  <View key={item.id}>
                      {renderItem({ item })}
                  </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
      {/* End of Jey's conditional logic */}

      <AddGateCodeModal
        visible={isAddModalVisible}
        onClose={handleAddModalClose}
        onSave={handleGateCodeSaved}
        currentDspName={userData?.dspName}
        currentUserId={user?.uid}
        userDspId={currentDspId}
        dsps={dsps}
        isAdmin={isAdmin}
      />

      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleImageViewerClose}
      >
        <TouchableWithoutFeedback onPress={handleImageViewerClose}>
          <View style={styles.imageViewerBackground}>
            {currentImageUri && (
              <Image
                source={typeof currentImageUri === 'string' ? { uri: currentImageUri } : currentImageUri}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity
        style={[styles.fab, !isDataReady && styles.fabDisabled]}
        onPress={handleAddGateCode}
        disabled={!isDataReady}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9AA2',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 20,
  },
  searchBar: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f1f1f1',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 80, 
    flexGrow: 1, 
  },
  codeCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({ 
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ':hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
        },
      },
    }),
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15,
    ...Platform.select({ 
      web: {
        cursor: 'zoom-in',
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardContent: {
    flex: 1,
  },
  location: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginBottom: 5,
  },
  code: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 3,
  },
  dspName: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300, 
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9AA2',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  imageViewerBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '95%',
    height: '95%',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
    backgroundColor: '#6BB9F0',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    ...Platform.select({ 
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        ':hover': {
          backgroundColor: '#5ca3e0',
        },
      },
    }),
  },
  fabDisabled: {
    backgroundColor: '#A0C8D6',
    ...Platform.select({ 
      web: {
        cursor: 'not-allowed',
        ':hover': {
          backgroundColor: '#A0C8D6',
        },
      },
    }),
  },
  deleteIconContainer: {
    padding: 5,
    ...Platform.select({ 
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        ':hover': {
          transform: 'scale(1.1)',
        },
      },
    }),
  },
  cardActions: {
    marginLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default GateCodes;
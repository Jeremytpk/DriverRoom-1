import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  Alert, TouchableOpacity, ScrollView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, 
    limit, doc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

const ReturnsDetail = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { driverId } = route.params;
  
  const [returns, setReturns] = useState([]);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDriverData = async () => {
    try {
      const driverRef = doc(db, 'users', driverId);
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
          setDriver(driverSnap.data());
      }
    } catch (error) {
        console.error("Jey: Error fetching driver data:", error);
    }
  };

  useEffect(() => {
    fetchDriverData();

    const returnsQuery = query(
      collection(db, 'returns'),
      where('driverId', '==', driverId)
    );
    
    const unsubscribe = onSnapshot(returnsQuery, (snapshot) => {
        
        ////////TIME LIMIT//////////////////////////////////////////////////////////////
      const oneMinuteAgo = new Date(Date.now() - 90000);
      const returnsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => (item.timestamp?.toDate() || new Date(0)) > oneMinuteAgo);

      returnsList.sort((a, b) => {
          const aTimestamp = a.timestamp?.toDate() || new Date(0);
          const bTimestamp = b.timestamp?.toDate() || new Date(0);
          return bTimestamp.getTime() - aTimestamp.getTime();
      });

      setReturns(returnsList);
      setLoading(false);
    }, (error) => {
      console.error("Jey: Error fetching returns details:", error);
      Alert.alert("Error", "Failed to load returns data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [driverId]);

  // Jey: New useEffect for automatic data deletion
  useEffect(() => {
    const deleteOldReturns = async () => {
      try {
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const returnsToDeleteQuery = query(
          collection(db, 'returns'),
          where('timestamp', '<', oneMinuteAgo)
        );
        
        const querySnapshot = await getDocs(returnsToDeleteQuery);
        if (!querySnapshot.empty) {
          const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          console.log(`Jey: Deleted ${querySnapshot.docs.length} old return logs.`);
        }
      } catch (error) {
        console.error("Jey: Error auto-deleting old return logs:", error);
      }
    };
    
    // Jey: Run the deletion function once every minute
    const intervalId = setInterval(deleteOldReturns, 60000);
    
    // Jey: Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const handleRTS = () => {
    if (!driver) return;
    Alert.alert(
      "Confirm Return to Station",
      `Are you sure you want to mark ${driver.name} as returned to station?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', driverId);
              await updateDoc(userRef, { isRTSConfirmed: true });
              Alert.alert("Success", `${driver.name} has been marked as returned to station.`);
              navigation.goBack();
            } catch (error) {
              console.error("Jey: Error updating RTS status:", error);
              Alert.alert("Error", "Failed to confirm return to station. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderReturnItem = ({ item }) => (
    <View style={returnsDetailStyles.returnCard}>
      <View style={returnsDetailStyles.returnHeader}>
        <Text style={returnsDetailStyles.returnDate}>
          <Ionicons name="calendar-outline" size={16} color="#666" />{' '}
          {item.timestamp?.toDate().toLocaleDateString()}
        </Text>
        <Text style={returnsDetailStyles.returnTime}>
          <Ionicons name="time-outline" size={16} color="#666" />{' '}
          {item.timestamp?.toDate().toLocaleTimeString()}
        </Text>
      </View>
      <View style={returnsDetailStyles.returnInfo}>
        <Text style={returnsDetailStyles.returnLabel}>Returns Count:</Text>
        <Text style={returnsDetailStyles.returnCount}>{item.returnCount}</Text>
      </View>
      {item.reasons?.length > 0 && (
        <View style={returnsDetailStyles.reasonsContainer}>
          <Text style={returnsDetailStyles.reasonsLabel}>Reasons:</Text>
          <View style={returnsDetailStyles.reasonPillContainer}>
            {item.reasons.map((reason, index) => (
              <View key={index} style={returnsDetailStyles.reasonPill}>
                <Text style={returnsDetailStyles.reasonPillText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={returnsDetailStyles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
      </View>
    );
  }

  return (
    <View style={returnsDetailStyles.container}>
      <View style={returnsDetailStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={returnsDetailStyles.headerTitle}>Return Details for {driver?.name}</Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        data={returns}
        renderItem={renderReturnItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={() => (
          <View style={returnsDetailStyles.emptyContainer}>
            <MaterialIcons name="local-shipping" size={50} color="#999" />
            <Text style={returnsDetailStyles.emptyText}>No return logs found for this driver.</Text>
          </View>
        )}
        contentContainerStyle={returnsDetailStyles.listContent}
      />
      <View style={returnsDetailStyles.rtsButtonContainer}>
        <TouchableOpacity onPress={handleRTS} style={returnsDetailStyles.rtsButton}>
          <Ionicons name="home-outline" size={24} color="#fff" />
          <Text style={returnsDetailStyles.rtsButtonText}>Return to Station</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const returnsDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  returnCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  returnDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  returnTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  returnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  returnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  returnCount: {
    fontSize: 16,
    color: '#FF5733',
    fontWeight: 'bold',
  },
  reasonsContainer: {
    marginTop: 5,
  },
  reasonsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  reasonPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reasonPill: {
    backgroundColor: '#e6f3ff',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  reasonPillText: {
    fontSize: 12,
    color: '#6BB9F0',
    fontWeight: 'bold',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  rtsButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  rtsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b9ca2',
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  rtsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5733',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ReturnsDetail;
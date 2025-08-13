import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDocs, getFirestore, orderBy
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
  lightBackground: '#EBF5F5',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  red: '#dc3545',
  green: '#4CAF50',
  grayProgress: '#D3D3D3',
};

const trainingDays = ['Day 1', 'Day 2', 'Day 3'];

const Team = () => {
  const { userData, setUserData } = useAuth(); // Jey: Get setUserData from AuthContext
  const navigation = useNavigation();
  const db = getFirestore();
  const [trainers, setTrainers] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [trainerSearchQuery, setTrainerSearchQuery] = useState('');
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  
  const [searchedDriver, setSearchedDriver] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [traineeSearchQuery, setTraineeSearchQuery] = useState('');
  const [traineeSuggestions, setTraineeSuggestions] = useState([]);
  const [isTraineeSearching, setIsTraineeSearching] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  
  const [myTraineeSchedule, setMyTraineeSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  const [selectedTrainingDay, setSelectedTrainingDay] = useState(trainingDays[0]);

  useEffect(() => {
    if (!userData?.dspName) return;

    const trainersQuery = query(
      collection(db, 'users'),
      where('dspName', '==', userData.dspName),
      where('isTrainer', '==', true)
    );
    const unsubscribeTrainers = onSnapshot(trainersQuery, (snapshot) => {
      const trainersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainers(trainersList);
    }, (error) => {
      console.error("Jey: Error fetching trainers:", error);
    });

    const traineesQuery = query(
      collection(db, 'users'),
      where('dspName', '==', userData.dspName),
      where('role', 'in', ['driver', 'trainee'])
    );
    const unsubscribeTrainees = onSnapshot(traineesQuery, (snapshot) => {
        const traineesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrainees(traineesList);
        setLoading(false);
    }, (error) => {
        console.error("Jey: Error fetching trainees:", error);
        setLoading(false);
    });

    if (userData?.isTrainer) {
        setScheduleLoading(true);
        const myScheduleQuery = query(
            collection(db, 'users'),
            where('assignedTrainerId', '==', userData.uid)
        );
        const unsubscribeMySchedule = onSnapshot(myScheduleQuery, (snapshot) => {
            const myTraineeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyTraineeSchedule(myTraineeList);
            setScheduleLoading(false);
        });
        return () => {
            unsubscribeTrainers();
            unsubscribeTrainees();
            unsubscribeMySchedule();
        };
    }

    return () => {
      unsubscribeTrainers();
      unsubscribeTrainees();
    };
  }, [userData?.dspName, userData?.isTrainer, userData?.uid]);

  const searchDrivers = useCallback(async (queryText, isTraineeSearch = false) => {
    if (queryText.length < 3) {
      if (isTraineeSearch) {
        setTraineeSuggestions([]);
      } else {
        setSearchSuggestions([]);
      }
      return;
    }
    if (isTraineeSearch) {
      setIsTraineeSearching(true);
    } else {
      setIsSearching(true);
    }
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('dspName', '==', userData.dspName)
      );
      const snapshot = await getDocs(q);
      const allDrivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredSuggestions = allDrivers.filter(driver =>
        (driver.name.toLowerCase().includes(queryText.toLowerCase()) ||
        driver.email.toLowerCase().includes(queryText.toLowerCase()))
      );
      if (isTraineeSearch) {
        setTraineeSuggestions(filteredSuggestions);
      } else {
        setSearchSuggestions(filteredSuggestions);
      }
    } catch (error) {
      console.error("Jey: Error searching for drivers:", error);
    } finally {
      if (isTraineeSearch) {
        setIsTraineeSearching(false);
      } else {
        setIsSearching(false);
      }
    }
  }, [userData?.dspName]);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchDrivers(trainerSearchQuery, false);
    }, 500);
    return () => clearTimeout(handler);
  }, [trainerSearchQuery, searchDrivers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchDrivers(traineeSearchQuery, true);
    }, 500);
    return () => clearTimeout(handler);
  }, [traineeSearchQuery, searchDrivers]);

  const handlePromoteToTrainer = async () => {
    if (!searchedDriver) return;
    try {
      const userRef = doc(db, 'users', searchedDriver.id);
      await updateDoc(userRef, { isTrainer: true, role: 'trainer' });
      Alert.alert("Success", `${searchedDriver.name} is now a trainer.`);
      setSearchedDriver({ ...searchedDriver, isTrainer: true, role: 'trainer' });
    } catch (error) {
      console.error("Jey: Error promoting to trainer:", error);
      Alert.alert("Error", "Failed to promote. Please try again.");
    }
  };

  const handleDemoteToDriver = async () => {
    if (!searchedDriver) return;
    try {
      const userRef = doc(db, 'users', searchedDriver.id);
      await updateDoc(userRef, { isTrainer: false, role: 'driver' });
      Alert.alert("Success", `${searchedDriver.name} is now a driver.`);
      
      // Jey: Update the local state of the current user if they are the one being demoted
      if (userData.uid === searchedDriver.id) {
          setUserData(prevData => ({ ...prevData, isTrainer: false, role: 'driver' }));
      }

      setSearchedDriver({ ...searchedDriver, isTrainer: false, role: 'driver' });
    } catch (error) {
      console.error("Jey: Error demoting to driver:", error);
      Alert.alert("Error", "Failed to demote. Please try again.");
    }
  };
  
  const handleAssignTrainee = async (trainerId, trainerName) => {
    if (!selectedTrainee) {
      Alert.alert("No Trainee Selected", "Please select a trainee to assign.");
      return;
    }
    if (!selectedTrainingDay) {
        Alert.alert("No Training Day Selected", "Please select a training day (Day 1, 2, or 3) for the trainee.");
        return;
    }
    try {
      const traineeRef = doc(db, 'users', selectedTrainee.id);
      await updateDoc(traineeRef, {
        assignedTrainerId: trainerId,
        assignedTrainerName: trainerName,
        trainingDay: selectedTrainingDay,
      });
      Alert.alert("Success", `Trainee ${selectedTrainee.name} assigned to ${trainerName} for ${selectedTrainingDay} successfully!`);
      setSelectedTrainee(null);
      setSelectedTraineeId(null);
      setSelectedTrainingDay(trainingDays[0]);
    } catch (error) {
      console.error("Jey: Error assigning trainee:", error);
      Alert.alert("Error", "Failed to assign trainee. Please try again.");
    }
  };
  
  const renderTrainerItem = ({ item }) => (
    <View style={styles.trainerCard}>
      <Ionicons name="person-circle-outline" size={30} color={Colors.primaryTeal} />
      <View style={styles.trainerInfo}>
        <Text style={styles.trainerName}>{item.name}</Text>
        <Text style={styles.trainerRole}>Trainer</Text>
      </View>
      {selectedTrainee && (
          <TouchableOpacity
              style={styles.assignButton}
              onPress={() => handleAssignTrainee(item.id, item.name)}
          >
              <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
      )}
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
    >
      <ScrollView contentContainerStyle={styles.teamContainer}>
        {userData?.isTrainer && (
            <View style={styles.scheduleSection}>
                <Text style={styles.scheduleTitle}>Your trainees for today:</Text>
                {scheduleLoading ? (
                    <ActivityIndicator size="small" color={Colors.primaryTeal} style={{marginTop: 10}} />
                ) : myTraineeSchedule.length > 0 ? (
                    <FlatList
                        data={myTraineeSchedule}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.scheduleItem}>
                                <Ionicons name="person-outline" size={20} color={Colors.darkText} />
                                <Text style={styles.scheduleItemText}>{item.name}</Text>
                                <View style={styles.scheduleDayTag}>
                                  <Text style={styles.scheduleDayText}>{item.trainingDay || 'Day 1'}</Text>
                                </View>
                            </View>
                        )}
                        scrollEnabled={false}
                    />
                ) : (
                    <Text style={styles.emptyText}>No trainees assigned to you today.</Text>
                )}
            </View>
        )}

        {userData?.isDsp && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manage Trainers</Text>
              <TextInput
                style={styles.searchBar}
                placeholder="Search for a driver to promote..."
                placeholderTextColor={Colors.mediumText}
                value={trainerSearchQuery}
                onChangeText={setTrainerSearchQuery}
                autoCapitalize="none"
              />
              {isSearching && <ActivityIndicator size="small" color={Colors.primaryTeal} style={{marginTop: 10}} />}
              {trainerSearchQuery.length > 2 && searchSuggestions.length > 0 && !searchedDriver && (
                  <View style={styles.suggestionsContainer}>
                      {searchSuggestions.map((driver) => (
                          <TouchableOpacity
                              key={driver.id}
                              style={styles.suggestionItem}
                              onPress={() => {
                                setSearchedDriver(driver);
                                setTrainerSearchQuery('');
                                setSearchSuggestions([]);
                              }}
                          >
                              <Text style={styles.suggestionText}>{driver.name} ({driver.email})</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              )}
              
              {searchedDriver && (
                <View style={styles.selectedDriverCard}>
                  <View>
                    <Text style={styles.selectedDriverName}>{searchedDriver.name}</Text>
                    <Text style={styles.selectedDriverEmail}>{searchedDriver.email}</Text>
                    <Text style={styles.selectedDriverRole}>{searchedDriver.isTrainer ? "Current Role: Trainer" : "Current Role: Driver"}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.promoteButton, searchedDriver.isTrainer && styles.demoteButton]}
                    onPress={searchedDriver.isTrainer ? handleDemoteToDriver : handlePromoteToTrainer}
                  >
                    <Text style={styles.promoteButtonText}>
                      {searchedDriver.isTrainer ? 'Make a Driver' : 'Promote to Trainer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Trainers</Text>
              {trainers.length > 0 ? (
                <FlatList
                  data={trainers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTrainerItem}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No trainers found for your DSP.</Text>
              )}
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assign Trainees</Text>
              
              <TextInput
                style={styles.searchBar}
                placeholder="Search for a trainee from user list"
                placeholderTextColor={Colors.mediumText}
                value={traineeSearchQuery}
                onChangeText={setTraineeSearchQuery}
                autoCapitalize="none"
              />
              {isTraineeSearching && <ActivityIndicator size="small" color={Colors.primaryTeal} style={{marginTop: 10}} />}
              {traineeSearchQuery.length > 2 && traineeSuggestions.length > 0 && !selectedTrainee && (
                  <View style={styles.suggestionsContainer}>
                      {traineeSuggestions.map((trainee) => (
                          <TouchableOpacity
                              key={trainee.id}
                              style={styles.suggestionItem}
                              onPress={() => {
                                setSelectedTrainee(trainee);
                                setTraineeSearchQuery('');
                                setTraineeSuggestions([]);
                              }}
                          >
                              <Text style={styles.suggestionText}>{trainee.name} ({trainee.email})</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              )}
              
              {selectedTrainee && (
                <View style={styles.traineeCard}>
                  <Text style={styles.traineeName}>{selectedTrainee.name}</Text>
                  <Text style={styles.traineeDetails}>{selectedTrainee.email}</Text>
                  {selectedTrainee.assignedTrainerName && (
                      <Text style={styles.traineeDetails}>Assigned Trainer: {selectedTrainee.assignedTrainerName}</Text>
                  )}
                </View>
              )}
              
              {selectedTrainee && (
                <View style={styles.daySelectionContainer}>
                    <Text style={styles.daySelectionLabel}>Select Training Day:</Text>
                    {trainingDays.map((day) => (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.daySelectionButton,
                                selectedTrainingDay === day && styles.daySelectionButtonActive,
                            ]}
                            onPress={() => setSelectedTrainingDay(day)}
                        >
                            <Text style={[
                                styles.daySelectionButtonText,
                                selectedTrainingDay === day && styles.daySelectionButtonTextActive,
                            ]}>{day}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
              )}

              {selectedTrainee && (
                <View style={styles.assignmentTip}>
                    <Text style={styles.assignmentTipText}>Now select a trainer from the list above to assign this trainee to.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {(userData?.isDsp || userData?.isTrainer) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Chat</Text>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => navigation.navigate('TeamChat')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color={Colors.white} />
              <Text style={styles.chatButtonText}>Go to Team Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  teamContainer: {
    flexGrow: 1,
    backgroundColor: Colors.lightBackground,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 10,
    marginTop: 10,
  },
  searchBar: {
    height: 45,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: Colors.white,
  },
  suggestionsContainer: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 16,
    color: Colors.darkText,
  },
  selectedDriverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedDriverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  selectedDriverEmail: {
    fontSize: 14,
    color: Colors.mediumText,
  },
  selectedDriverRole: {
    fontSize: 12,
    color: Colors.mediumText,
    marginTop: 5,
  },
  promoteButton: {
    backgroundColor: Colors.primaryTeal,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  demoteButton: {
    backgroundColor: Colors.red,
  },
  promoteButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trainerInfo: {
    marginLeft: 15,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  trainerRole: {
    fontSize: 12,
    color: Colors.mediumText,
  },
  assignButton: {
    backgroundColor: Colors.accentSalmon,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  assignButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  addTraineeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  addTraineeInput: {
    flex: 1,
    height: 45,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  addTraineeButton: {
    backgroundColor: Colors.primaryTeal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
  },
  addTraineeButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 20,
  },
  chatButton: {
    backgroundColor: Colors.primaryTeal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  chatButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  daySelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 10,
  },
  daySelectionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  daySelectionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
  },
  daySelectionButtonActive: {
    backgroundColor: Colors.primaryTeal,
  },
  daySelectionButtonText: {
    color: Colors.darkText,
    fontWeight: '500',
  },
  daySelectionButtonTextActive: {
    color: Colors.white,
  },
});

export default Team;
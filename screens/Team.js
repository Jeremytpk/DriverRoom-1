import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDocs, getFirestore, orderBy, addDoc, deleteDoc
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
  const { userData } = useAuth();
  const navigation = useNavigation();
  const db = getFirestore();
  const [trainers, setTrainers] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [trainerSearchQuery, setTrainerSearchQuery] = useState('');
  const [searchedDriver, setSearchedDriver] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [newTraineeName, setNewTraineeName] = useState('');
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
      collection(db, 'trainees'),
      where('dspName', '==', userData.dspName)
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
        collection(db, 'trainees'),
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

  const searchDrivers = useCallback(async (queryText) => {
    if (queryText.length < 3) {
      setSearchSuggestions([]);
      return;
    }
    setIsSearching(true);
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
      setSearchSuggestions(filteredSuggestions);
    } catch (error) {
      console.error("Jey: Error searching for drivers:", error);
    } finally {
      setIsSearching(false);
    }
  }, [userData?.dspName]);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchDrivers(trainerSearchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [trainerSearchQuery, searchDrivers]);

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
      setSearchedDriver({ ...searchedDriver, isTrainer: false, role: 'driver' });
    } catch (error) {
      console.error("Jey: Error demoting to driver:", error);
      Alert.alert("Error", "Failed to demote. Please try again.");
    }
  };
  
  const handleAddTrainee = async () => {
    if (!newTraineeName.trim()) {
      Alert.alert("Input Required", "Please enter a name for the new trainee.");
      return;
    }
    try {
      await addDoc(collection(db, 'trainees'), {
        name: newTraineeName.trim(),
        dspName: userData.dspName,
        createdAt: new Date(),
        assignedTrainerId: null,
        assignedTrainerName: null,
        trainingDay: null,
      });
      Alert.alert("Success", `${newTraineeName.trim()} has been added to the trainee list.`);
      setNewTraineeName('');
    } catch (error) {
      console.error("Jey: Error adding new trainee:", error);
      Alert.alert("Error", "Failed to add trainee. Please try again.");
    }
  };

  const handleDeleteTrainee = () => {
    if (!selectedTrainee) return;
  
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete ${selectedTrainee.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const traineeRef = doc(db, 'trainees', selectedTrainee.id);
              await deleteDoc(traineeRef);
              Alert.alert("Success", `${selectedTrainee.name} has been deleted.`);
              setSelectedTrainee(null); // Clear selected trainee after deletion
              setSelectedTrainingDay(trainingDays[0]);
            } catch (error) {
              console.error("Jey: Error deleting trainee:", error);
              Alert.alert("Error", "Failed to delete trainee. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
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
      const traineeRef = doc(db, 'trainees', selectedTrainee.id);
      await updateDoc(traineeRef, {
        assignedTrainerId: trainerId,
        assignedTrainerName: trainerName,
        trainingDay: selectedTrainingDay,
      });
      Alert.alert("Success", `Trainee ${selectedTrainee.name} assigned to ${trainerName} for ${selectedTrainingDay} successfully!`);
      setSelectedTrainee(null);
      setSelectedTrainingDay(trainingDays[0]);
    } catch (error) {
      console.error("Jey: Error assigning trainee:", error);
      Alert.alert("Error", "Failed to assign trainee. Please try again.");
    }
  };

  const handleUnassignTrainee = async () => {
    if (!selectedTrainee) return;

    try {
      const traineeRef = doc(db, 'trainees', selectedTrainee.id);
      await updateDoc(traineeRef, {
        assignedTrainerId: null,
        assignedTrainerName: null,
        trainingDay: null,
      });
      Alert.alert("Success", `Trainee ${selectedTrainee.name} has been unassigned.`);
      setSelectedTrainee(null);
      setSelectedTrainingDay(trainingDays[0]);
    } catch (error) {
      console.error("Jey: Error unassigning trainee:", error);
      Alert.alert("Error", "Failed to unassign trainee. Please try again.");
    }
  };

  const handleSelectTrainee = (trainee) => {
    setSelectedTrainee(trainee);
  };
  
  const renderTrainerItem = ({ item }) => {
    const isCurrentlyAssigned = selectedTrainee?.assignedTrainerId === item.id;
    return (
      <View style={styles.trainerCard}>
        <Ionicons name="person-circle-outline" size={30} color={Colors.primaryTeal} />
        <View style={styles.trainerInfo}>
          <Text style={styles.trainerName}>{item.name}</Text>
          <Text style={styles.trainerRole}>Trainer</Text>
        </View>
        {selectedTrainee && (
            isCurrentlyAssigned ? (
                <TouchableOpacity
                    style={[styles.assignButton, styles.unassignButton]}
                    onPress={handleUnassignTrainee}
                >
                    <Text style={styles.assignButtonText}>Unassign</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => handleAssignTrainee(item.id, item.name)}
                >
                    <Text style={styles.assignButtonText}>Assign</Text>
                </TouchableOpacity>
            )
        )}
      </View>
    );
  };

  const renderScheduleItem = ({ item }) => {
    const getDayProgress = (day) => {
      const dayNumber = parseInt(day.replace('Day ', ''));
      const lastCompletedDay = parseInt(item.trainingDay?.replace('Day ', ''));
      return dayNumber <= lastCompletedDay;
    };
  
    return (
      <View style={styles.traineeProgressCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle-outline" size={30} color={Colors.primaryTeal} />
          <View style={styles.cardInfo}>
            <Text style={styles.traineeNameText}>{item.name}</Text>
            <Text style={styles.traineeAssignedText}>Assigned: {item.assignedTrainerName || 'N/A'}</Text>
          </View>
        </View>
  
        <View style={styles.progressContainer}>
          {trainingDays.map((day) => (
            <View
              key={day}
              style={[
                styles.progressDay,
                getDayProgress(day) ? styles.progressDayComplete : styles.progressDayIncomplete,
              ]}
            >
              <Text style={styles.progressDayText}>{day}</Text>
            </View>
          ))}
        </View>
        {/*
        <TouchableOpacity style={styles.startTrainingButton}>
          <Text style={styles.startTrainingButtonText}>Start Training</Text>
        </TouchableOpacity>
        */}
      </View>
    );
  };
  
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
                <Text style={styles.scheduleTitle}>Your Trainee Progress:</Text>
                {scheduleLoading ? (
                    <ActivityIndicator size="small" color={Colors.primaryTeal} style={{marginTop: 10}} />
                ) : myTraineeSchedule.length > 0 ? (
                    <FlatList
                        data={myTraineeSchedule}
                        keyExtractor={item => item.id}
                        renderItem={renderScheduleItem}
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
              <Text style={styles.sectionTitle}>Manage Trainees</Text>

              <View style={styles.addTraineeContainer}>
                <TextInput
                  style={styles.addTraineeInput}
                  placeholder="Enter new trainee's name"
                  placeholderTextColor={Colors.mediumText}
                  value={newTraineeName}
                  onChangeText={setNewTraineeName}
                  autoCapitalize="words"
                />
                <TouchableOpacity style={styles.addTraineeButton} onPress={handleAddTrainee}>
                  <Text style={styles.addTraineeButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subSectionTitle}>Select an Unassigned Trainee:</Text>
              {trainees.filter(t => t.assignedTrainerId === null).length > 0 ? (
                <FlatList
                  data={trainees.filter(t => t.assignedTrainerId === null)}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.traineeListItem,
                        selectedTrainee?.id === item.id && styles.selectedTraineeListItem,
                      ]}
                      onPress={() => handleSelectTrainee(item)}
                    >
                      <Text style={styles.traineeListItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>All trainees are currently assigned.</Text>
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
                    <Text style={styles.assignmentTipText}>Now select a trainer from the list above to assign this trainee to. Or, unselect the trainee to go back to the full list.</Text>
                </View>
              )}

              {selectedTrainee && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTrainee}>
                  <Text style={styles.deleteButtonText}>Delete Trainee</Text>
                </TouchableOpacity>
              )}

              <View style={styles.separator} />
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
  unassignButton: {
    backgroundColor: Colors.red,
  },
  deleteButton: {
    backgroundColor: Colors.red,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
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
  traineeListItem: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedTraineeListItem: {
    backgroundColor: Colors.lightGray,
    borderColor: Colors.primaryTeal,
    borderWidth: 2,
  },
  traineeListItemText: {
    fontSize: 16,
    color: Colors.darkText,
    fontWeight: '500',
  },
  assignmentTip: {
    backgroundColor: Colors.accentSalmon,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  assignmentTipText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  traineeProgressCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardInfo: {
    marginLeft: 15,
  },
  traineeNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  traineeAssignedText: {
    fontSize: 14,
    color: Colors.mediumText,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressDay: {
    flex: 1,
    height: 17,
    borderRadius: 5,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDayComplete: {
    backgroundColor: Colors.green,
  },
  progressDayIncomplete: {
    backgroundColor: Colors.grayProgress,
  },
  progressDayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
  },
  startTrainingButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startTrainingButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Team;
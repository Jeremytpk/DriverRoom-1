import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import RescueModal from '../components/RescueModal';

const OnDutty = ({ navigation }) => {
    const { userData } = useAuth();
    const [onDutyUsers, setOnDutyUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    
    const [checkedInCount, setCheckedInCount] = useState(0);

    const checkIntervalRef = useRef(null);
    const [isRescueModalVisible, setIsRescueModalVisible] = useState(false);
    const [selectedUserForRescue, setSelectedUserForRescue] = useState(null);
    const [allDrivers, setAllDrivers] = useState([]);
    
    const [companyPlan, setCompanyPlan] = useState('Essentials');
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [returnsCache, setReturnsCache] = useState({});

    const autoSwitchToOffDuty = async (userId, userName) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { isOnDutty: false });
            console.log(`Jey: User ${userName} automatically switched to off-duty.`);
        } catch (error) {
            console.error("Jey: Error auto-switching user status:", error);
            Alert.alert("Error", "Failed to update user status automatically.");
        }
    };

    useEffect(() => {
      const returnsQuery = query(collection(db, 'returns'));
      const unsubscribeReturns = onSnapshot(returnsQuery, (snapshot) => {
        const cache = {};
        snapshot.forEach(doc => {
          const driverId = doc.data().driverId;
          if (cache[driverId]) {
            cache[driverId].push(doc.id);
          } else {
            cache[driverId] = [doc.id];
          }
        });
        setReturnsCache(cache);
      }, (error) => {
        console.error("Jey: Error fetching returns in real-time:", error);
      });
      return () => unsubscribeReturns();
    }, []);

    useEffect(() => {
        if (!userData?.dspName) {
            setLoading(false);
            return;
        }

        const onDutyQuery = query(
            collection(db, 'users'),
            where('dspName', '==', userData.dspName),
            where('role', 'in', ['driver', 'trainer']),
            where('isOnDutty', '==', true)
        );
        
        const allDriversQuery = query(
            collection(db, 'users'),
            where('dspName', '==', userData.dspName),
            where('role', 'in', ['driver', 'trainer'])
        );
        
        const unsubscribe = onSnapshot(onDutyQuery, (snapshot) => {
            const usersList = snapshot.docs.map(userDoc => ({
                id: userDoc.id,
                ...userDoc.data()
            }));
            
            const count = usersList.filter(user => user.isCheckedIn).length;
            setCheckedInCount(count);

            const sortedUsers = usersList.sort((a, b) => {
                if (a.isCheckedIn && !b.isCheckedIn) {
                    return -1;
                }
                if (!a.isCheckedIn && b.isCheckedIn) {
                    return 1;
                }
                if (a.role === 'trainer' && b.role === 'driver') {
                    return -1;
                }
                if (a.role === 'driver' && b.role === 'trainer') {
                    return 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            setOnDutyUsers(sortedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Jey: Error fetching on-duty users:", error);
            Alert.alert("Error", "Failed to load on-duty users.");
            setLoading(false);
        });

        const unsubscribeAllDrivers = onSnapshot(allDriversQuery, (snapshot) => {
            const allDriversList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllDrivers(allDriversList);
        });

        return () => {
            unsubscribe();
            unsubscribeAllDrivers();
        };
    }, [userData?.dspName]);

    useEffect(() => {
        if (!userData?.uid) return;

        const userRef = doc(db, 'users', userData.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCompanyPlan(data.plan || 'Essentials');
            }
        });

        return () => unsubscribe();
    }, [userData?.uid]);

    const handleRemoveFromOnDuty = (userId, userName) => {
        Alert.alert(
            "Remove User",
            `Are you sure you want to remove ${userName} from the on-duty list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'users', userId);
                            await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false });
                            Alert.alert("Success", `${userName} has been moved to Off-Duty.`);
                            setSelectedUsers(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(userId);
                                return newSet;
                            });
                        } catch (error) {
                            console.error("Jey: Error updating user status:", error);
                            Alert.alert("Error", "Failed to update user status. Please try again.");
                        }
                    },
                    style: "destructive"
                }
            ],
            { cancelable: true }
        );
    };

    const handleToggleSelect = (userId) => {
        setSelectedUsers(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(userId)) {
                newSelected.delete(userId);
            } else {
                newSelected.add(userId);
            }
            return newSelected;
        });
    };

    const handleSelectAll = () => {
        setMultiSelectMode(true);
        if (selectedUsers.size === onDutyUsers.length) {
            setSelectedUsers(new Set());
        } else {
            const allUserIds = onDutyUsers.map(user => user.id);
            setSelectedUsers(new Set(allUserIds));
        }
    };
    
    const handleMassOffDuty = () => {
        if (selectedUsers.size === 0) {
            Alert.alert("No Users Selected", "Please select at least one user to move off-duty.");
            return;
        }

        Alert.alert(
            "Move Users Off-Duty",
            `Are you sure you want to move ${selectedUsers.size} user(s) to off-duty?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    onPress: async () => {
                        try {
                            const updates = Array.from(selectedUsers).map(async (userId) => {
                                const userRef = doc(db, 'users', userId);
                                await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false });
                            });
                            await Promise.all(updates);
                            setSelectedUsers(new Set());
                            setMultiSelectMode(false);
                            Alert.alert("Success", `${selectedUsers.size} users have been moved to Off-Duty.`);
                        } catch (error) {
                            console.error("Jey: Error mass updating user status:", error);
                            Alert.alert("Error", "Failed to update all user statuses. Please try again.");
                        }
                    },
                    style: "destructive"
                }
            ],
            { cancelable: true }
        );
    };
    
    const handleDispatchRescue = async (rescueInitiator, rescuee, rescueAddress) => {
      console.log(`Jey: Dispatching ${rescueInitiator.name} to rescue ${rescuee.name} at ${rescueAddress}`);
      Alert.alert(
        "Rescue Dispatched", 
        `${rescueInitiator.name} is now en route to rescue ${rescuee.name} at ${rescueAddress}.`
      );
    };
    
    const handleRTS = (driver) => {
        Alert.alert(
            "Confirm Return to Station",
            `Are you sure you want to confirm that ${driver.name} has safely returned to the station?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'users', driver.id);
                            // Jey: Set isRTSConfirmed to true
                            await updateDoc(userRef, { isRTSConfirmed: true });
                            Alert.alert("Success", `Confirmation sent to ${driver.name}.`);
                            setSelectedUserForRescue(null);
                        } catch (error) {
                            console.error("Jey: Error updating RTS status:", error);
                            Alert.alert("Error", "Failed to confirm return to station. Please try again.");
                        }
                    },
                },
            ]
        );
    };
    
    const filteredUsers = onDutyUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }) => {
        const isSelected = selectedUsers.has(item.id);
        const isTrainer = item.role === 'trainer';
        const isSelectedForRescue = selectedUserForRescue && selectedUserForRescue.id === item.id;
        
        const handleCardPress = () => {
            if (companyPlan === 'Executive') {
                setSelectedUserForRescue(isSelectedForRescue ? null : item);
            }
        };
        
        const hasReturns = returnsCache[item.id] && returnsCache[item.id].length > 0;
        // Jey: New conditional check for the eye icon
        const showEyeIcon = hasReturns && !item.isRTSConfirmed;

        return (
            <View>
                <TouchableOpacity
                    onPress={handleCardPress}
                    style={[
                        styles.userCard,
                        isSelectedForRescue && styles.selectedCardForRescue
                    ]}
                >
                    <View style={styles.userInfo}>
                        {multiSelectMode && (
                            <TouchableOpacity onPress={() => handleToggleSelect(item.id)} style={styles.checkboxContainer}>
                                <Ionicons
                                    name={isSelected ? "checkbox-outline" : "square-outline"}
                                    size={24}
                                    color={isSelected ? "#6BB9F0" : "#999"}
                                />
                            </TouchableOpacity>
                        )}
                        <Ionicons name="person-circle-outline" size={40} color={isTrainer ? "#FFC107" : "#6BB9F0"} />
                        <View style={styles.userNameContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.userName}>{item.name}</Text>
                                {isTrainer && (
                                    <View style={styles.trainerLabel}>
                                        <Text style={styles.trainerLabelText}>Trainer</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.userEmail}>{item.email}</Text>
                            {item.onDutySince && (
                                <Text style={styles.onDutySinceText}>
                                    On-duty since: {item.onDutySince.toDate().toLocaleTimeString()}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.actionButtons}>
                        {showEyeIcon && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.viewReturnsButton]}
                                onPress={() => navigation.navigate('ReturnsDetail', { driverId: item.id })}
                            >
                                <Ionicons name="eye-outline" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                        
                        {item.isCheckedIn && (
                            <View style={styles.checkedInIcon}>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveFromOnDuty(item.id, item.name)}
                        >
                            <Ionicons name="car-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
                 {companyPlan === 'Executive' && isSelectedForRescue && (
                    <View style={styles.rescueActionContainer}>
                        <TouchableOpacity 
                            style={styles.rescueButton}
                            onPress={() => setIsRescueModalVisible(true)}
                        >
                            <Ionicons name="help-circle-outline" size={20} color="#fff" />
                            <Text style={styles.rescueButtonText}>Dispatch Rescue</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.rescueButton, styles.rtsButton]}
                            onPress={() => handleRTS(item)}
                        >
                            <MaterialIcons name="home" size={20} color="#fff" />
                            <Text style={styles.rescueButtonText}>Return to Station</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#6BB9F0" />
                <Text style={styles.loadingText}>Loading on-duty list...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>On-Duty Drivers & Trainers</Text>
            
            <TextInput
                style={styles.searchBar}
                placeholder="Search for a user..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <View style={styles.headerControls}>
                <View style={styles.selectAndCount}>
                    {companyPlan !== 'Executive' && (
                        <TouchableOpacity onPress={() => setMultiSelectMode(!multiSelectMode)}>
                            <Text style={styles.selectAllText}>
                                {multiSelectMode ? 'Cancel Selection' : 'Multi-Select'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.countText}>
                        <Text style={{color: '#333', fontWeight: 'bold'}}>{onDutyUsers.length}</Text> on-duty | <Text style={{color: '#28a745', fontWeight: 'bold'}}>{checkedInCount}</Text> checked-in
                    </Text>
                </View>
                {(multiSelectMode && selectedUsers.size > 0) && (
                    <TouchableOpacity style={styles.offDutyAllButton} onPress={handleMassOffDuty}>
                        <Text style={styles.offDutyAllButtonText}>
                            Move {selectedUsers.size} User(s) Off-Duty
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            <FlatList
                data={filteredUsers}
                keyExtractor={item => item.id}
                renderItem={renderUserItem}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={50} color="#999" />
                        <Text style={styles.emptyText}>No users are currently on duty.</Text>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
            />
            <RescueModal
    visible={isRescueModalVisible}
    onClose={() => setIsRescueModalVisible(false)}
    onDispatch={handleDispatchRescue}
    allDrivers={onDutyUsers.filter(d => d.id !== selectedUserForRescue?.id)}
    rescuer={selectedUserForRescue}
/>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6BB9F0',
        marginBottom: 20,
        textAlign: 'center',
    },
    searchBar: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        fontSize: 16,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    headerControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectAndCount: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectAllText: {
        color: '#6BB9F0',
        fontWeight: 'bold',
    },
    countText: {
        marginLeft: 15,
        fontSize: 14,
        color: '#666',
    },
    offDutyAllButton: {
        backgroundColor: '#FF5733',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    offDutyAllButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    userCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedCardForRescue: {
        backgroundColor: '#e0f2f7',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userNameContainer: {
        marginLeft: 10,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 12,
        color: '#999',
    },
    onDutySinceText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkedInIcon: {
        backgroundColor: '#28a745',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    removeButton: {
        backgroundColor: '#FF5733',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
    },
    trainerLabel: {
        backgroundColor: '#FFC107',
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    trainerLabelText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    rescueActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#6BB9F0',
        padding: 15,
        marginBottom: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    rescueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rescueButtonText: {
        marginLeft: 10,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    rtsButton: {
        backgroundColor: '#FF9AA2',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewReturnsButton: {
        backgroundColor: '#6BB9F0',
        height: 30,
        width: 30,
        borderRadius: 100,
        color: '#6BB9F0',
        marginRight: 10,
        paddingLeft: 5,
        paddingTop: 4,
    },
});

export default OnDutty;
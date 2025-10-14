import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, Alert, TextInput } from 'react-native';
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

        const autoSwitchToOffDuty = async (userId, userName) => {
            try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false, isRescuing: false, isRTSConfirmed: false });
                console.log(`Jey: User ${userName} automatically switched to off-duty after 9 hours.`);
            } catch (error) {
                console.error("Jey: Error auto-switching user status:", error);
                // No Alert here, as it runs silently in the background
            }
        };

        const unsubscribe = onSnapshot(onDutyQuery, (snapshot) => {
            const usersList = snapshot.docs.map(userDoc => ({
                id: userDoc.id,
                ...userDoc.data()
            }));

            // Auto off-duty logic: for each on-duty user, set a timer to auto off-duty after 9 hours
            usersList.forEach(user => {
                if (user.isOnDutty && user.onDutySince) {
                    const now = new Date();
                    // Firebase timestamp conversion logic
                    const onDutyTime = user.onDutySince.toDate ? user.onDutySince.toDate() : new Date(user.onDutySince);
                    const diff = now - onDutyTime;
                    if (diff > 32400000) { // 9 hours in milliseconds
                        autoSwitchToOffDuty(user.id, user.name);
                    }
                }
            });

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
                            await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false, isRescuing: false, isRTSConfirmed: false }); // Reset all duty-related flags
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

    // Jey: UPDATED: Simplified since multiSelectMode is now externally controlled.
    const handleToggleSelect = (userId) => {
        if (!multiSelectMode) return; // Only allow selection if mode is active

        setSelectedUsers(prevSelected => {
            const newSelected = new Set(prevSelected);
            const isCurrentlySelected = newSelected.has(userId);

            if (isCurrentlySelected) {
                newSelected.delete(userId);
            } else {
                newSelected.add(userId);
            }
            
            return newSelected;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            const allUserIds = filteredUsers.map(user => user.id);
            setSelectedUsers(new Set(allUserIds));
        }
    };
    
    // Jey: New function to activate/deactivate multi-select mode
    const toggleMultiSelectMode = () => {
        const newState = !multiSelectMode;
        setMultiSelectMode(newState);
        if (!newState) {
            setSelectedUsers(new Set());
        }
    };
    
    const handleMassOffDuty = () => {
        if (selectedUsers.size === 0) {
            Alert.alert("No Users Selected", "Please select at least one user to move off-duty.");
            return;
        }

        Alert.alert(
            "Move Users Off-Duty",
            `Are you sure you want to move ${selectedUsers.size} user(s) to off-duty? This will reset their check-in and rescue status.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    onPress: async () => {
                        try {
                            const updates = Array.from(selectedUsers).map(async (userId) => {
                                const userRef = doc(db, 'users', userId);
                                await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false, isRescuing: false, isRTSConfirmed: false }); // Reset all duty-related flags
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
      try {
          // 1. Mark the rescuee as needing rescue
          await updateDoc(doc(db, 'users', rescuee.id), { isRescued: true });
          
          // 2. Mark the rescuer as currently rescuing
          await updateDoc(doc(db, 'users', rescueInitiator.id), { isRescuing: true });
          
          console.log(`Jey: Dispatching ${rescueInitiator.name} to rescue ${rescuee.name} at ${rescueAddress}`);
          
          Alert.alert(
            "Rescue Dispatched", 
            `${rescueInitiator.name} is now en route to rescue ${rescuee.name} at ${rescueAddress}.`
          );
          setIsRescueModalVisible(false); // Close modal on success
          setSelectedUserForRescue(null); // Clear selected user
      } catch (error) {
          console.error("Jey: Error dispatching rescue:", error);
          Alert.alert("Error", "Failed to dispatch rescue. Please try again.");
      }
    };
    
    const handleRTS = (driver) => {
        Alert.alert(
            "Confirm Return to Station",
            `Are you sure you want to confirm that ${driver.name} has safely returned to the station? This will clear all pending return issues.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'users', driver.id);
                            // Jey: Mark RTS confirmed and clear any pending rescue status
                            await updateDoc(userRef, { isRTSConfirmed: true, isRescued: false, isRescuing: false }); 
                            Alert.alert("Success", `Return to Station confirmed for ${driver.name}.`);
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
            // Jey: Only respond to card press for selection if mode is ACTIVE
            if (multiSelectMode) {
                handleToggleSelect(item.id);
            } else if (companyPlan === 'Executive') {
                setSelectedUserForRescue(isSelectedForRescue ? null : item);
            }
        };
        
        const hasReturns = returnsCache[item.id] && returnsCache[item.id].length > 0;
        const showEyeIcon = hasReturns && !item.isRTSConfirmed; 

        let cardStyle = styles.userCard;
        if (item.isRescued) {
            cardStyle = [styles.userCard, styles.cardPriorityRescue];
        } else if (showEyeIcon) {
            cardStyle = [styles.userCard, styles.cardPriorityReturns];
        } 
        
        return (
            <View>
                <TouchableOpacity
                    onPress={handleCardPress}
                    style={[
                        cardStyle,
                        isSelectedForRescue && styles.selectedCardForRescue,
                        isSelected && !isSelectedForRescue && styles.selectedCardForMultiSelect // New style for selection visual
                    ]}
                >
                    <View style={styles.userInfo}>
                        {/* Jey: FIX: Checkbox now only appears if multiSelectMode is TRUE */}
                        {multiSelectMode && (
                            <TouchableOpacity onPress={() => handleToggleSelect(item.id)} style={styles.checkboxContainer}>
                                <Ionicons
                                    name={isSelected ? "checkbox-outline" : "square-outline"}
                                    size={24}
                                    color={isSelected ? "#f7a680" : "#999"} // Salmon accent for selection
                                />
                            </TouchableOpacity>
                        )}
                        <Ionicons 
                            name="person-circle-outline" 
                            size={40} 
                            // Jey: Increased left margin if checkbox is NOT visible
                            style={!multiSelectMode && {marginLeft: 10}}
                            color={isTrainer ? "#f7a680" : "#007a82"} 
                        />
                        <View style={styles.userNameContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.userName}>{item.name}</Text>
                                {item.isRescuing && <View style={styles.rescueIndicator} />}
                                {item.isRescued && <View style={[styles.rescueIndicator, styles.needRescueIndicator]} />} 
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
                        {/* Only show single remove button if NOT in multi-select mode */}
                        {!multiSelectMode && (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => handleRemoveFromOnDuty(item.id, item.name)}
                            >
                                <Ionicons name="close-outline" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
                 {/* Rescue Actions Section (Executive Plan only) */}
                 {companyPlan === 'Executive' && isSelectedForRescue && (
                    <View style={styles.rescueActionContainer}>
                        <TouchableOpacity 
                            style={[styles.rescueButton, {backgroundColor: '#007a82'}]} // Teal
                            onPress={() => setIsRescueModalVisible(true)}
                        >
                            <Ionicons name="locate-outline" size={20} color="#fff" />
                            <Text style={styles.rescueButtonText}>Dispatch Rescue</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.rescueButton, styles.rtsButton]}
                            onPress={() => handleRTS(item)}
                        >
                            <MaterialIcons name="home" size={20} color="#fff" />
                            <Text style={styles.rescueButtonText}>Confirm RTS</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#007a82" />
                <Text style={styles.loadingText}>Loading on-duty list...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Live Dispatch Dashboard</Text>
            
            <TextInput
                style={styles.searchBar}
                placeholder="Search by driver name..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <View style={styles.headerControls}>
                <View style={styles.selectAndCount}>
                    {/* Jey: Explicit button to enter/exit multi-select mode */}
                    <TouchableOpacity onPress={toggleMultiSelectMode}>
                        <Text style={[styles.selectAllText, styles.listActionText]}>
                            {multiSelectMode ? 'Exit Select Mode' : 'Select Users'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.countText}>
                    <Text style={{color: '#333', fontWeight: 'bold'}}>{onDutyUsers.length}</Text> ON-DUTY | <Text style={{color: '#28a745', fontWeight: 'bold'}}>{checkedInCount}</Text> CHECKED-IN
                </Text>
                
                {/* Jey: Mass Off-Duty Button - Prominent when items are selected */}
                {(selectedUsers.size > 0) && (
                    <TouchableOpacity style={styles.offDutyAllButton} onPress={handleMassOffDuty}>
                        <Text style={styles.offDutyAllButtonText}>
                            MOVE {selectedUsers.size} OFF-DUTY
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {/* Show Select All/Deselect All row ONLY when multi-select is active */}
            {multiSelectMode && (
                <View style={styles.selectAllRow}>
                    <TouchableOpacity
                        onPress={toggleSelectAll}
                        style={{ marginRight: 15 }}
                    >
                        <Text style={[styles.selectAllText, styles.listActionText]}>
                            {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
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
                rescuee={selectedUserForRescue}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    // Jey: --- Global Container ---
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4', // Professional light gray background
        padding: 16, // Adjusted padding
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: '700', // Bolder title
        color: '#333333', // Darker text
        marginBottom: 20,
        textAlign: 'left',
        paddingTop: 10,
    },
    
    // Jey: --- Search & Controls ---
    searchBar: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 10,
        fontSize: 16,
        borderColor: '#e0e0e0', // Subtle border
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        flex: 1,
        justifyContent: 'flex-start',
    },
    selectAllText: {
        color: '#007a82', // Teal accent
        fontWeight: '600',
        fontSize: 14,
    },
    cancelText: {
        color: '#f7a680',
    },
    countText: {
        marginLeft: 15, // Added back margin to separate from the select button
        fontSize: 14,
        color: '#666',
        flexShrink: 1,
    },
    offDutyAllButton: {
        backgroundColor: '#f7a680', // Salmon for the mass removal action
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    offDutyAllButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    selectAllRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    listActionText: {
        fontSize: 15,
    },
    
    // Jey: --- List Items ---
    listContent: {
        paddingBottom: 20,
    },
    userCard: {
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4, // Visual weight
        borderLeftColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    // Priority status visual cues
    cardPriorityReturns: {
        borderLeftColor: '#d1904c', // Gold/Brown for returns
    },
    cardPriorityRescue: {
        borderLeftColor: '#dc3545', // Red for needing rescue
    },
    selectedCardForRescue: {
        backgroundColor: '#e6f7f8', // Light teal for rescue selection
    },
    selectedCardForMultiSelect: {
        backgroundColor: '#fffbe6', // Light yellow/cream for multi-selection
        borderLeftColor: '#f7a680', // Salmon left border
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userNameContainer: {
        // Jey: Removed fixed left margin for dynamic spacing
        marginLeft: 10,
        flexShrink: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: '600',
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
    trainerLabel: {
        backgroundColor: '#555',
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    trainerLabelText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    
    // Jey: --- Status Icons & Buttons ---
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkedInIcon: {
        backgroundColor: '#28a745', // Standard Green for Check-in
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    removeButton: {
        backgroundColor: '#f7a680', // Salmon for single removal
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewReturnsButton: {
        backgroundColor: '#007a82', // Teal for info/view actions
        height: 30,
        width: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rescueIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007bff', // Blue for Rescuing
        marginLeft: 8,
    },
    needRescueIndicator: {
        backgroundColor: '#dc3545', // Red for Needs Rescue
    },
    checkboxContainer: {
        marginRight: 10,
    },

    // Jey: --- Rescue Actions ---
    rescueActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e6f7f8',
        padding: 12,
        marginBottom: 8,
        borderRadius: 10,
    },
    rescueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    rescueButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rtsButton: {
        backgroundColor: '#d1904c', // Gold/Brown for RTS (completion/info)
    },
    
    // Jey: --- Empty State ---
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
});

export default OnDutty;
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const OnDutty = () => {
    const { userData } = useAuth();
    const [onDutyUsers, setOnDutyUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    
    const [checkedInCount, setCheckedInCount] = useState(0);

    const checkIntervalRef = useRef(null);

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
        if (!userData?.dspName) {
            setLoading(false);
            return;
        }

        const onDutyQuery = query(
            collection(db, 'users'),
            where('dspName', '==', userData.dspName),
            where('role', 'in', ['driver', 'trainer']), // Fetch both drivers and trainers
            where('isOnDutty', '==', true)
        );

        const unsubscribe = onSnapshot(onDutyQuery, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const count = usersList.filter(user => user.isCheckedIn).length;
            setCheckedInCount(count);

            const sortedUsers = usersList.sort((a, b) => {
                // Prioritize checked-in users at the top
                if (a.isCheckedIn && !b.isCheckedIn) {
                    return -1;
                }
                if (!a.isCheckedIn && b.isCheckedIn) {
                    return 1;
                }
                // Then sort by role (trainers before drivers)
                if (a.role === 'trainer' && b.role === 'driver') {
                    return -1;
                }
                if (a.role === 'driver' && b.role === 'trainer') {
                    return 1;
                }
                // Finally, sort alphabetically by name
                return a.name.localeCompare(b.name);
            });
            
            setOnDutyUsers(sortedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Jey: Error fetching on-duty users:", error);
            Alert.alert("Error", "Failed to load on-duty users.");
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [userData?.dspName]);

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
                            // Jey: Automatically check out the user when they are removed from on-duty
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
        if (selectedUsers.size === onDutyUsers.length) {
            setSelectedUsers(new Set());
        } else {
            const allUserIds = onDutyUsers.map(user => user.id);
            setSelectedUsers(new Set(allUserIds));
        }
    };

    const handleMassOffDuty = () => {
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
                                // Jey: Also check out all mass-removed users
                                await updateDoc(userRef, { isOnDutty: false, isCheckedIn: false });
                            });
                            await Promise.all(updates);
                            setSelectedUsers(new Set());
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

    const filteredUsers = onDutyUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }) => {
        const isSelected = selectedUsers.has(item.id);
        const isTrainer = item.role === 'trainer';

        return (
            <TouchableOpacity onPress={() => handleToggleSelect(item.id)} style={styles.userCard}>
                <View style={styles.userInfo}>
                    <Ionicons
                        name={isSelected ? "checkbox-outline" : "square-outline"}
                        size={24}
                        color={isSelected ? "#6BB9F0" : "#999"}
                        style={{ marginRight: 10 }}
                    />
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
                    <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={styles.selectAllText}>
                            {selectedUsers.size === onDutyUsers.length ? "Deselect All" : "Select All"}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.countText}>
                        <Text style={{color: '#333', fontWeight: 'bold'}}>{onDutyUsers.length}</Text> on-duty | <Text style={{color: '#28a745', fontWeight: 'bold'}}>{checkedInCount}</Text> checked-in
                    </Text>
                </View>
                {selectedUsers.size > 0 && (
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
    // New styles for the Trainer label
    trainerLabel: {
        backgroundColor: '#FFC107', // A nice, visible color for the label
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
});

export default OnDutty;
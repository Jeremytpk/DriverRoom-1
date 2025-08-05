import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const OnDutty = () => {
    const { userData } = useAuth();
    const [onDutyDrivers, setOnDutyDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // Jey: State for search bar
    const [selectedDrivers, setSelectedDrivers] = useState(new Set()); // Jey: State for selected drivers

    const checkIntervalRef = useRef(null);

    const autoSwitchToOffDuty = async (driverId, driverName) => {
        try {
            const userRef = doc(db, 'users', driverId);
            await updateDoc(userRef, { isOnDutty: false });
            console.log(`Jey: Driver ${driverName} automatically switched to off-duty after 1 min.`);
        } catch (error) {
            console.error("Jey: Error auto-switching driver status:", error);
            Alert.alert("Error", "Failed to update driver status automatically.");
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
            where('role', '==', 'driver'),
            where('isOnDutty', '==', true)
        );

        const unsubscribe = onSnapshot(onDutyQuery, (snapshot) => {
            const driversList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOnDutyDrivers(driversList);
            setLoading(false);
        }, (error) => {
            console.error("Jey: Error fetching on-duty drivers:", error);
            Alert.alert("Error", "Failed to load on-duty drivers.");
            setLoading(false);
        });

        checkIntervalRef.current = setInterval(() => {
            const now = new Date().getTime();
            onDutyDrivers.forEach(driver => {
                if (driver.onDutySince) {
                    const onDutyTime = driver.onDutySince.toDate().getTime();
                    const elapsedTime = now - onDutyTime;
                    if (elapsedTime >= 60000) {
                        autoSwitchToOffDuty(driver.id, driver.name);
                    }
                }
            });
        }, 1000);

        return () => {
            unsubscribe();
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [userData?.dspName, onDutyDrivers]);

    const handleRemoveFromOnDuty = (driverId, driverName) => {
        Alert.alert(
            "Remove Driver",
            `Are you sure you want to remove ${driverName} from the on-duty list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'users', driverId);
                            await updateDoc(userRef, { isOnDutty: false });
                            Alert.alert("Success", `${driverName} has been moved to Off-Duty.`);
                            setSelectedDrivers(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(driverId);
                                return newSet;
                            });
                        } catch (error) {
                            console.error("Jey: Error updating driver status:", error);
                            Alert.alert("Error", "Failed to update driver status. Please try again.");
                        }
                    },
                    style: "destructive"
                }
            ],
            { cancelable: true }
        );
    };

    // Jey: New function to toggle selection for a single driver
    const handleToggleSelect = (driverId) => {
        setSelectedDrivers(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(driverId)) {
                newSelected.delete(driverId);
            } else {
                newSelected.add(driverId);
            }
            return newSelected;
        });
    };

    // Jey: New function to handle "select all" button
    const handleSelectAll = () => {
        if (selectedDrivers.size === onDutyDrivers.length) {
            setSelectedDrivers(new Set()); // Deselect all
        } else {
            const allDriverIds = onDutyDrivers.map(driver => driver.id);
            setSelectedDrivers(new Set(allDriverIds)); // Select all
        }
    };

    // Jey: New function to move all selected drivers to off-duty
    const handleMassOffDuty = () => {
        Alert.alert(
            "Move Drivers Off-Duty",
            `Are you sure you want to move ${selectedDrivers.size} driver(s) to off-duty?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    onPress: async () => {
                        try {
                            const updates = Array.from(selectedDrivers).map(async (driverId) => {
                                const userRef = doc(db, 'users', driverId);
                                await updateDoc(userRef, { isOnDutty: false });
                            });
                            await Promise.all(updates);
                            setSelectedDrivers(new Set()); // Clear selection after update
                            Alert.alert("Success", `${selectedDrivers.size} drivers have been moved to Off-Duty.`);
                        } catch (error) {
                            console.error("Jey: Error mass updating driver status:", error);
                            Alert.alert("Error", "Failed to update all driver statuses. Please try again.");
                        }
                    },
                    style: "destructive"
                }
            ],
            { cancelable: true }
        );
    };

    const filteredDrivers = onDutyDrivers.filter(driver =>
        driver.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderDriverItem = ({ item }) => {
        const isSelected = selectedDrivers.has(item.id);
        return (
            <TouchableOpacity onPress={() => handleToggleSelect(item.id)} style={styles.driverCard}>
                <View style={styles.driverInfo}>
                    <Ionicons
                        name={isSelected ? "checkbox-outline" : "square-outline"}
                        size={24}
                        color={isSelected ? "#6BB9F0" : "#999"}
                        style={{ marginRight: 10 }}
                    />
                    <Ionicons name="person-circle-outline" size={40} color="#6BB9F0" />
                    <View style={styles.driverNameContainer}>
                        <Text style={styles.driverName}>{item.name}</Text>
                        <Text style={styles.driverId}>{item.id}</Text>
                        {item.onDutySince && (
                            <Text style={styles.onDutySinceText}>
                                On-duty since: {item.onDutySince.toDate().toLocaleTimeString()}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFromOnDuty(item.id, item.name)}
                >
                    <Ionicons name="car-outline" size={20} color="#fff" style={styles.removeIcon} />
                    <Text style={styles.removeButtonText}>Off-Duty</Text>
                </TouchableOpacity>
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
            <Text style={styles.title}>On-Duty Drivers</Text>
            
            {/* Jey: Search Bar */}
            <TextInput
                style={styles.searchBar}
                placeholder="Search for a driver..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            {/* Jey: Select All and Mass Off-Duty buttons */}
            <View style={styles.headerControls}>
                <TouchableOpacity onPress={handleSelectAll}>
                    <Text style={styles.selectAllText}>
                        {selectedDrivers.size === onDutyDrivers.length ? "Deselect All" : "Select All"}
                    </Text>
                </TouchableOpacity>
                {selectedDrivers.size > 0 && (
                    <TouchableOpacity style={styles.offDutyAllButton} onPress={handleMassOffDuty}>
                        <Text style={styles.offDutyAllButtonText}>
                            Move {selectedDrivers.size} Driver(s) Off-Duty
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            <FlatList
                data={filteredDrivers}
                keyExtractor={item => item.id}
                renderItem={renderDriverItem}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={50} color="#999" />
                        <Text style={styles.emptyText}>No drivers are currently on duty.</Text>
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
    selectAllText: {
        color: '#6BB9F0',
        fontWeight: 'bold',
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
    driverCard: {
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
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    driverNameContainer: {
        marginLeft: 10,
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    driverId: {
        fontSize: 12,
        color: '#999',
    },
    onDutySinceText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    removeButton: {
        flexDirection: 'row',
        backgroundColor: '#FF5733',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    //removeIcon: {
     //   transform: [{ rotateZ: '180deg' }],
    //},
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        marginTop: 10,
        textAlign: 'center',
    },
});

export default OnDutty;
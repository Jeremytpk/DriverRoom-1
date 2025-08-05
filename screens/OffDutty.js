import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore'; // Jey: Import Firestore functions
import { onAuthStateChanged } from 'firebase/auth'; // Jey: Import onAuthStateChanged
import { auth, db } from '../firebase'; // Jey: Assuming 'auth' and 'db' are exported from your firebase.js

const OffDutty = () => {
    const navigation = useNavigation();
    const [isOnDutyStatus, setIsOnDutyStatus] = useState(false); // Jey: Local state for on-duty status
    const [loadingStatus, setLoadingStatus] = useState(true); // Jey: Loading state for this component's data fetch
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null); // Jey: To store the current user's UID

    // Jey: Function to check the isOnDutty status directly from Firestore
    const checkOnDutyStatus = async (uid) => {
        if (!uid) {
            setLoadingStatus(false);
            return;
        }
        setLoadingStatus(true);
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userDataFromFirestore = userDocSnap.data();
                setIsOnDutyStatus(userDataFromFirestore.isOnDutty || false);
            } else {
                console.log("Jey: User document not found for UID:", uid);
                setIsOnDutyStatus(false); // Assume off-duty if document doesn't exist
            }
        } catch (error) {
            console.error('Jey: Error fetching isOnDutty status:', error);
            Alert.alert('Error', 'Failed to load status. Please try again.');
            setIsOnDutyStatus(false); // Assume off-duty on error
        } finally {
            setLoadingStatus(false);
        }
    };

    // Jey: Effect to listen for auth state changes and get the user ID
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
            } else {
                setCurrentUserId(null);
                setIsOnDutyStatus(false); // Jey: If no user, definitely off-duty
                setLoadingStatus(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Jey: Effect to check status when currentUserId changes
    useEffect(() => {
        if (currentUserId) {
            checkOnDutyStatus(currentUserId);
        }
    }, [currentUserId]); // Jey: Re-run when currentUserId changes

    // Jey: This effect will automatically navigate the user if their status changes
    useEffect(() => {
        if (isOnDutyStatus) {
            navigation.navigate('Home');
        }
    }, [isOnDutyStatus, navigation]);

    // Jey: Handler for the refresh button
    const handleRefresh = async () => {
        if (!currentUserId) {
            Alert.alert("Error", "User not logged in. Cannot refresh status.");
            return;
        }
        setIsRefreshing(true);
        try {
            await checkOnDutyStatus(currentUserId);
        } catch (error) {
            console.error('Jey: Error refreshing user status:', error);
            Alert.alert('Error', 'Failed to refresh status. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/relaxing.png')}
                style={styles.relaxingImage}
                resizeMode="contain"
            />
            <View style={styles.contentContainer}>
                <Ionicons name="lock-closed-outline" size={60} color="#FF9AA2" style={styles.lockIcon} />
                <Text style={styles.title}>You are Off-Duty</Text>
                <Text style={styles.message}>
                    Your account is currently off-duty.
                </Text>
                <Text style={styles.message}>Enjoy your day off.</Text>
                {loadingStatus && ( // Jey: Use local loadingStatus here
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#6BB9F0" />
                        <Text style={styles.loadingText}>Checking status...</Text>
                    </View>
                )}
            </View>
            <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={isRefreshing || loadingStatus} // Jey: Disable if already refreshing or loading
            >
                {isRefreshing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={styles.refreshIcon} />
                        <Text style={styles.refreshButtonText}>Refresh Status</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    relaxingImage: {
        width: '100%',
        height: 250,
        marginBottom: 30,
    },
    contentContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    lockIcon: {
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF9AA2',
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#666',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6BB9F0',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    refreshIcon: {},
});

export default OffDutty;

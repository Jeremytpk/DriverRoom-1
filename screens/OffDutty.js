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
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

// Jey: Import your local image assets
import lockIcon from '../assets/png/lock.png';
import refreshIcon from '../assets/png/refresh.png';

const OffDutty = () => {
    const navigation = useNavigation();
    const [isOnDutyStatus, setIsOnDutyStatus] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

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
                setIsOnDutyStatus(false);
            }
        } catch (error) {
            console.error('Jey: Error fetching isOnDutty status:', error);
            Alert.alert('Error', 'Failed to load status. Please try again.');
            setIsOnDutyStatus(false);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
            } else {
                setCurrentUserId(null);
                setIsOnDutyStatus(false);
                setLoadingStatus(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            checkOnDutyStatus(currentUserId);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (isOnDutyStatus) {
            navigation.navigate('Home');
        }
    }, [isOnDutyStatus, navigation]);

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
                {/* Jey: Replaced Ionicons with Image component */}
                <Image source={lockIcon} style={styles.customLockIcon} />
                <Text style={styles.title}>You are Off-Duty</Text>
                <Text style={styles.message}>
                    Your account is currently off-duty.
                </Text>
                <Text style={styles.message}>Enjoy your day off.</Text>
                {loadingStatus && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#6BB9F0" />
                        <Text style={styles.loadingText}>Checking status...</Text>
                    </View>
                )}
            </View>
            <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={isRefreshing || loadingStatus}
            >
                {isRefreshing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        {/* Jey: Replaced Ionicons with Image component */}
                        <Image source={refreshIcon} style={styles.customRefreshIcon} />
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
    // Jey: New style for the custom lock image
    customLockIcon: {
        width: 60,
        height: 60,
        marginBottom: 15,
        tintColor: '#FF9AA2', // You can apply a tint color to the PNG if needed
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
    // Jey: New style for the custom refresh image
    customRefreshIcon: {
        width: 20,
        height: 20,
        tintColor: '#FFFFFF',
    },
});

export default OffDutty;
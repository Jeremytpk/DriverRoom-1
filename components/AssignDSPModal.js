import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const AssignDSPModal = ({ visible, onClose, users, company, onAssign }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [assigning, setAssigning] = useState(false); // Jey: State for showing loading during assignment

  // Jey: Filter users based on search query or show all if no query
  useEffect(() => {
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = users.filter(user =>
        user.name && user.name.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users); // Jey: Show all users if search query is empty
    }
  }, [searchQuery, users]);

  // Jey: Reset search query when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  // Jey: Handle the assignment process
  const handleAssignPress = async (user) => {
    setAssigning(true);
    try {
      await onAssign(user, company); // Jey: Call the onAssign function passed from AdminScreen
      onClose(); // Jey: Close modal on successful assignment
    } catch (error) {
      console.error("Jey: Error during DSP assignment:", error);
      // Jey: Alert is handled in AdminScreen's handleAssignDSP, no need for another here
    } finally {
      setAssigning(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <MaterialIcons name="person-outline" size={24} color="#6BB9F0" />
        <Text style={styles.userName}>{item.name || item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.assignButton}
        onPress={() => handleAssignPress(item)}
        disabled={assigning} // Jey: Disable button during assignment
      >
        {assigning ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.assignButtonText}>Assign</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign DSP for {company?.name || 'Company'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle-outline" size={28} color="#FF5733" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchBar}
            placeholder="Search users..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyListText}>
                {searchQuery ? "No matching users found." : "No users available for assignment."}
              </Text>
            }
            contentContainerStyle={styles.listContentContainer}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Jey: Dark overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxHeight: '80%', // Jey: Limit height for better mobile experience
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6BB9F0',
    flex: 1,
  },
  closeButton: {
    padding: 5,
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
  },
  listContentContainer: {
    paddingBottom: 10,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  assignButton: {
    backgroundColor: '#FF9AA2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: 80, // Jey: Ensure consistent button size
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
});

export default AssignDSPModal;

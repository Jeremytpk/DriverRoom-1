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
  const [selectedUsers, setSelectedUsers] = useState([]); // Jey: State to hold multiple selected users
  const [assigning, setAssigning] = useState(false);

  // Jey: Filter users based on search query or show all if no query
  useEffect(() => {
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = users.filter(user =>
        user.name && user.name.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  // Jey: Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedUsers([]); // Jey: Clear selected users when the modal closes
    }
  }, [visible]);

  // Jey: Toggle user selection
  const toggleUserSelection = (user) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Jey: Handle the final assignment process for all selected users
  const handleConfirmAssignment = async () => {
    if (selectedUsers.length === 0) {
      return;
    }
    setAssigning(true);
    try {
      await onAssign(selectedUsers); // Jey: Pass the array of selected users to onAssign
      onClose();
    } catch (error) {
      console.error("Jey: Error during DSP assignment:", error);
    } finally {
      setAssigning(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemAssigned]}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.userInfo}>
          <MaterialIcons name="person-outline" size={24} color={isSelected ? "#fff" : "#6BB9F0"} />
          <Text style={[styles.userName, isSelected && styles.userNameAssigned]}>
            {item.name || item.email}
          </Text>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };

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

          <TouchableOpacity
            style={[styles.confirmButton, selectedUsers.length === 0 && styles.confirmButtonDisabled]}
            onPress={handleConfirmAssignment}
            disabled={selectedUsers.length === 0 || assigning}
          >
            {assigning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {`Assign ${selectedUsers.length} User(s)`}
              </Text>
            )}
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
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
  userItemAssigned: {
    backgroundColor: '#6BB9F0',
    borderColor: '#6BB9F0',
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
  userNameAssigned: {
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
});

export default AssignDSPModal;
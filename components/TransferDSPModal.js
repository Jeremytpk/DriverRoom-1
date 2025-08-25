import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';

const TransferDSPModal = ({ visible, onClose, companies, onTransfer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleConfirmTransfer = () => {
    if (!selectedCompany) {
      Alert.alert("No DSP Selected", "Please select a DSP from the list to continue.");
      return;
    }

    Alert.alert(
      "Confirm Transfer",
      `Are you sure you want to transfer this driver to ${selectedCompany.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            onTransfer(selectedCompany);
            onClose();
          },
        },
      ]
    );
  };

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCompanyItem = ({ item }) => {
    const isSelected = selectedCompany?.id === item.id;
    return (
      <TouchableOpacity
        style={[transferStyles.companyItem, isSelected && transferStyles.selectedCompanyItem]}
        onPress={() => setSelectedCompany(item)}
      >
        <Text style={transferStyles.companyName}>{item.name}</Text>
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
      <View style={transferStyles.modalOverlay}>
        <View style={transferStyles.modalContent}>
          <Text style={transferStyles.modalTitle}>Transfer Driver</Text>
          <Text style={transferStyles.modalText}>Select a new company to transfer this driver to:</Text>
          
          <TextInput
            style={transferStyles.searchBar}
            placeholder="Search DSPs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />

          <FlatList
            data={filteredCompanies}
            keyExtractor={item => item.id}
            renderItem={renderCompanyItem}
            contentContainerStyle={transferStyles.listContentContainer}
            ListEmptyComponent={<Text style={transferStyles.emptyListText}>No DSPs found.</Text>}
          />
          
          <View style={transferStyles.buttonContainer}>
            <TouchableOpacity style={transferStyles.closeButton} onPress={onClose}>
              <Text style={transferStyles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                transferStyles.confirmButton,
                !selectedCompany && transferStyles.disabledButton,
              ]}
              onPress={handleConfirmTransfer}
              disabled={!selectedCompany}
            >
              <Text style={transferStyles.confirmButtonText}>Confirm Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const transferStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchBar: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f1f1f1',
    color: '#333',
  },
  listContentContainer: {
    flexGrow: 1,
  },
  companyItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedCompanyItem: {
    borderColor: '#6BB9F0',
    backgroundColor: '#e6f3ff',
    borderWidth: 2,
  },
  companyName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  closeButton: {
    flex: 1,
    marginRight: 10,
    padding: 12,
    backgroundColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 10,
    padding: 12,
    backgroundColor: '#6BB9F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#B2D8F2',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 16,
  },
});

export default TransferDSPModal;
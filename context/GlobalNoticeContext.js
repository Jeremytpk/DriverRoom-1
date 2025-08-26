import React, { createContext, useContext, useState, useCallback } from 'react';

// Jey: Create the context with a default value
const GlobalNoticeContext = createContext();

// Jey: Create a custom hook for easier access to the context
export const useGlobalNotice = () => {
  return useContext(GlobalNoticeContext);
};

// Jey: The provider component that wraps your application
export const GlobalNoticeProvider = ({ children }) => {
  const [isGlobalNoticeModalVisible, setIsGlobalNoticeModalVisible] = useState(false);
  const [modalRefreshKey, setModalRefreshKey] = useState(0);

  // Jey: Functions to control the modal's visibility
  const showGlobalNoticeModal = useCallback(() => {
    setIsGlobalNoticeModalVisible(true);
    // Jey: Reset the modal's state when it's opened
    setModalRefreshKey(prevKey => prevKey + 1);
  }, []);

  const hideGlobalNoticeModal = useCallback(() => {
    setIsGlobalNoticeModalVisible(false);
  }, []);

  const value = {
    isGlobalNoticeModalVisible,
    showGlobalNoticeModal,
    hideGlobalNoticeModal,
    modalRefreshKey,
  };

  return (
    <GlobalNoticeContext.Provider value={value}>
      {children}
    </GlobalNoticeContext.Provider>
  );
};

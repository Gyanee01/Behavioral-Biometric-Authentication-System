import React, { createContext, useState, useContext } from 'react';

// 1. Create the context
const AuthContext = createContext(null);

// 2. Create the Provider component
export const AuthProvider = ({ children }) => {
  const [userEmail, setUserEmail] = useState(null);

  // Function to handle login
  const login = (email) => {
    setUserEmail(email);
  };

  // Function to handle logout
  const logout = () => {
    setUserEmail(null);
  };

  const value = { userEmail, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Create a custom hook to use the context easily
export const useAuth = () => {
  return useContext(AuthContext);
};

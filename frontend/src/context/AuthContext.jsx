import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user details if token exists
  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, message: 'Invalid server response' };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid email or password.';
      return { success: false, message };
    }
  };

  // Google OAuth handler
  const googleLogin = async (payload) => {
    try {
      const response = await api.post('/auth/google', payload);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, message: 'Google sign-in failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Google sign-in error.';
      return { success: false, message };
    }
  };

  // Authenticate directly with token (used after invitation activation)
  const authenticateWithToken = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // Register handler
  const register = async (name, email, password, phone = '', role = 'customer') => {
    try {
      const response = await api.post('/auth/register', { name, email, password, phone, role });
      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          setUser(response.data.user);
        }
        return { success: true, user: response.data.user, message: response.data.message };
      }
      return { success: false, message: 'Registration failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error occurred during registration.';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Update profile handler
  const updateProfile = async (name, email, phone, password) => {
    try {
      const data = { name, email };
      if (phone !== undefined) data.phone = phone;
      if (password) data.password = password;

      const response = await api.put('/auth/profile', data);
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true, message: response.data.message };
      }
      return { success: false, message: 'Profile update failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error updating profile.';
      return { success: false, message };
    }
  };

  const isAdmin = user?.role === 'admin';
  const isDeliveryPartner = user?.role === 'delivery_partner';
  const isCustomer = user?.role === 'customer';
  const isCashier = user?.role === 'cashier';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        authenticateWithToken,
        logout,
        register,
        updateProfile,
        refreshUser: fetchCurrentUser,
        isAdmin,
        isDeliveryPartner,
        isCustomer,
        isCashier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
      if (response.data.success) {
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


  // Register (setup) handler
  const register = async (name, email, password, role = 'cashier') => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      if (response.data.success) {
        // If it returns a token (e.g. first admin setup), we log in immediately
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          setUser(response.data.user);
        }
        return { success: true };
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
  const updateProfile = async (name, email, password) => {
    try {
      const data = { name, email };
      if (password) data.password = password;
      
      const response = await api.put('/auth/profile', data);
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, message: 'Profile update failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error updating profile.';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        updateProfile,
        refreshUser: fetchCurrentUser,
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

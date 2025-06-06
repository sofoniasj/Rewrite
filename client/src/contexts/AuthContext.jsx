// Rewrite/client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Configure Axios instance for API calls
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://rewriteb.onrender.com/api', // Fallback if env var is not set
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rewriteToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('rewriteToken'));
  const [loading, setLoading] = useState(true); // Initial loading state for checking token
  const [error, setError] = useState(null); // For storing auth-related errors
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      const { data } = await apiClient.get('/auth/me');
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUser(null);
      localStorage.removeItem('rewriteToken'); // Clear invalid token
      setToken(null);
      // Optionally navigate to login or show error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('rewriteToken');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setLoading(false); // No token, no need to fetch, stop loading
    }
  }, [fetchUserProfile]);


  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      localStorage.setItem('rewriteToken', data.token);
      setToken(data.token);
      setUser(data); // The user object from login response
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/'); // Navigate to homepage or dashboard after login
      return true;
    } catch (err) {
      console.error('Login failed:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const signup = async (username, password, agreedToTerms) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/signup', { username, password, agreedToTerms });
      localStorage.setItem('rewriteToken', data.token);
      setToken(data.token);
      setUser(data); // The user object from signup response
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setLoading(false);
      navigate('/'); // Navigate to homepage or dashboard after signup
      return true;
    } catch (err) {
      console.error('Signup failed:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setLoading(true);
    localStorage.removeItem('rewriteToken');
    setUser(null);
    setToken(null);
    delete apiClient.defaults.headers.common['Authorization'];
    setLoading(false);
    navigate('/login'); // Navigate to login page after logout
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user, // Derived state: true if user object exists
    loading,
    error,
    login,
    signup,
    logout,
    fetchUserProfile, // Expose if manual refresh is needed elsewhere
    apiClient, // Expose the configured axios instance if needed by other parts of the app
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Rewrite/client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://draftingb.onrender.com/api',
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rewriteToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('rewriteToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      setUser({ ...data }); // Replace user object for guaranteed re-render
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('rewriteToken');
      setToken(null);
      setUser(null);
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
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      localStorage.setItem('rewriteToken', data.token);
      setToken(data.token);
      setUser(data);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate('/');
      return true;
    } catch (err) {
      console.error('Login failed:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, password, agreedToTerms) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/signup', {
        username,
        password,
        agreedToTerms,
      });
      localStorage.setItem('rewriteToken', data.token);
      setToken(data.token);
      setUser(data);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate('/');
      return true;
    } catch (err) {
      console.error('Signup failed:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoading(true);
    localStorage.removeItem('rewriteToken');
    setUser(null);
    setToken(null);
    delete apiClient.defaults.headers.common['Authorization'];
    setLoading(false);
    navigate('/login');
  };

  const clearError = () => {
    setError(null);
  };

  // ✅ New: Function to update a single user field in context
  const updateUserField = (field, value) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      return { ...prevUser, [field]: value };
    });
  };

// --- NEW GOOGLE LOGIN FUNCTION ---
  const googleLogin = async (credentialResponse) => {
    setLoading(true); setError(null);
    try {
        const { data } = await apiClient.post('/auth/google', { 
            token: credentialResponse.credential 
        });
        localStorage.setItem('rewriteToken', data.token); 
        setToken(data.token); 
        setUser(data);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        setLoading(false); 
        navigate('/'); 
        return true;
    } catch (err) {
        console.error('Google Login failed:', err);
        setError(err.response?.data?.error || 'Google Login failed.');
        setLoading(false); 
        return false;
    }
  };


  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    signup,
    logout,
    fetchUserProfile,
    apiClient,
    clearError,
    updateUserField, 
    googleLogin,// ✅ Export the update function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
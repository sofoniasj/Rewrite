// Rewrite/client/src/pages/Auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Clear errors when component mounts or location changes
  useEffect(() => {
    clearError();
  }, [location, clearError]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || '/'); // Redirect to previous page or home
    }
  }, [isAuthenticated, navigate, location.state]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError(); // Clear previous errors before attempting login
    const success = await login(username, password);
    // Navigation is handled within the login function upon success
    if (!success) {
      // Handle login failure (error state is updated in context)
      console.log("Login failed from page");
    }
  };

  return (
    <div className="auth-page card" style={{ maxWidth: '450px', margin: '2rem auto' }}>
      <h1 className="text-center card-title">Login</h1>
      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-center my-1">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
};

export default LoginPage;

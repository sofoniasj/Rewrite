import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { GoogleLogin } from '@react-oauth/google'; // Import

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, googleLogin, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { clearError(); }, [location, clearError]);
  useEffect(() => { if (isAuthenticated) navigate(location.state?.from || '/'); }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    await login(username, password);
  };

  return (
    <div className="auth-page card" style={{ maxWidth: '450px', margin: '2rem auto', padding:'2rem' }}>
      <h1 className="text-center card-title">Login</h1>
      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}
      
      <form onSubmit={handleSubmit}>
         <div className="form-group">
          <label htmlFor="username">Username or Email</label>
          <input type="text" id="username" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} autoComplete="username" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} autoComplete="current-password" />
        </div>
        <div className="form-group" style={{textAlign:'right'}}>
            <Link to="/forgot-password" style={{fontSize:'0.9em'}}>Forgot Password?</Link>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom:'1rem' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
          <div style={{ flex: 1, borderBottom: '1px solid #ddd' }}></div>
          <span style={{ padding: '0 10px', color: '#777', fontSize:'0.9rem' }}>OR</span>
          <div style={{ flex: 1, borderBottom: '1px solid #ddd' }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
              onSuccess={credentialResponse => {
                  googleLogin(credentialResponse);
              }}
              onError={() => {
                  console.log('Google Login Failed');
              }}
              useOneTap
              theme="outline"
              size="large"
              width="100%"
              text="continue_with"
          />
      </div>

      <p className="text-center my-1 mt-3"> Don't have an account? <Link to="/signup">Sign Up</Link> </p>
    </div>
  );
};

export default LoginPage;
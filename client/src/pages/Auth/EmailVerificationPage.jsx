import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../src/contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { apiClient, fetchUserProfile } = useAuth(); 
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email address...');
  
  useEffect(() => {
    // If no token in URL, redirect or show error
    if (!token) {
        setStatus('error');
        setMessage('Verification link is missing or malformed.');
        return;
    }

    const verifyToken = async () => {
      try {
        const res = await apiClient.get(`/auth/verify-email/${token}`);
        
        setMessage(res.data.message || 'Email successfully verified! Redirecting to home...');
        setStatus('success');
        
        // Backend generated a new token and logged user in. We need to update the client state.
        // The generateToken in the server controller sets an HTTP-only cookie,
        // so we don't need a token in the response body. Just refresh user state.
        
        // This implicitly fetches the user data using the new token cookie.
        await fetchUserProfile(); 
        
        // Delay navigation slightly to let the message display
        setTimeout(() => {
            navigate('/');
        }, 2000);
        
      } catch (err) {
        console.error('Email verification failed:', err);
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verifyToken();
  }, [token, navigate, apiClient, fetchUserProfile]);

  const renderContent = () => {
    switch (status) {
        case 'verifying':
            return (
                <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-3 text-primary fw-bold">{message}</p>
                </div>
            );
        case 'success':
            return (
                <div className="text-center text-success">
                    <FaCheckCircle size={60} className="mb-3" />
                    <p className="lead fw-bold">{message}</p>
                    <Link to="/" className="btn btn-primary mt-3">Go to Home Page</Link>
                </div>
            );
        case 'error':
            return (
                <div className="text-center text-danger">
                    <FaExclamationCircle size={60} className="mb-3" />
                    <p className="lead fw-bold">{message}</p>
                    <p className="mt-3">If you need to resend the verification email, try logging in again.</p>
                    <Link to="/login" className="btn btn-primary mt-3">Go to Login</Link>
                </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card text-center shadow-lg" style={{ maxWidth: '450px', padding: '2rem', borderRadius: '12px' }}>
        <h1 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Email Verification</h1>
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
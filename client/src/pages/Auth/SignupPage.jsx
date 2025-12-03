import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../src/contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ReCAPTCHA from 'react-google-recaptcha';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const { apiClient } = useAuth();
  
  const recaptchaRef = useRef(null);
  
  // Use environment variable for key
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
        setFormError('You must agree to the terms and conditions.');
        return;
    }
    if (!captchaToken) {
        setFormError('Please complete the reCAPTCHA verification.');
        return;
    }

    setLoading(true);

    try {
        const { data } = await apiClient.post('/auth/signup', { 
            username, 
            email, 
            password, 
            captchaToken // Send the CAPTCHA token to the backend
        });

        // UPDATED SUCCESS MESSAGE FOR EMAIL VERIFICATION
        setFormSuccess(data.message || 'Registration successful! Please check your email inbox (and spam folder) for the verification link to activate your account.');
        
        setUsername(''); setEmail(''); setPassword(''); setConfirmPassword(''); setAgreedToTerms(false);
        if (recaptchaRef.current) recaptchaRef.current.reset(); 
        setCaptchaToken(null);

    } catch (err) {
        setFormError(err.response?.data?.error || 'Signup failed. Please try again.');
        if (recaptchaRef.current) recaptchaRef.current.reset();
        setCaptchaToken(null);
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <div className="auth-page card" style={{ maxWidth: '450px', margin: '2rem auto', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h1 className="text-center card-title" style={{ fontSize: '1.75rem', fontWeight: '700' }}>Create an Account</h1>
      
      {formError && <p className="error-message text-center">{formError}</p>}
      
      {formSuccess ? (
        <div className="success-message text-center" style={{padding: '1rem', border:'1px solid #c3e6cb', borderRadius:'4px', backgroundColor:'#d4edda', color: '#155724'}}>
          <p className="fw-bold">{formSuccess}</p> 
          <p className="mt-2">Once verified, you can proceed to the <Link to="/login" className="text-primary fw-bold">Login Page</Link>.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3">
          
          {/* Username Input */}
          <div className="form-group mb-3">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} placeholder="Choose a unique username" />
          </div>
          
          {/* Email Input */}
          <div className="form-group mb-3">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} placeholder="name@example.com" />
          </div>

          {/* Password Input */}
          <div className="form-group mb-3">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} placeholder="Min 6 characters" />
          </div>

          {/* Confirm Password Input */}
          <div className="form-group mb-3">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
          </div>
          
          {/* Terms Checkbox */}
          <div className="form-check mb-3">
            <input type="checkbox" id="terms" className="form-check-input" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} disabled={loading} />
            <label htmlFor="terms" className="form-check-label text-sm">I agree to the <a href="/terms" target="_blank" className="text-primary">Terms and Conditions</a></label>
          </div>

          {/* ReCAPTCHA */}
          {RECAPTCHA_SITE_KEY && (
            <div className="mb-4 d-flex justify-content-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={setCaptchaToken}
              />
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Sign Up'}
          </button>
        </form>
      )}

      <p className="text-center my-3 text-sm">
        Already have an account? <Link to="/login" className="text-primary fw-bold">Login</Link>
      </p>
    </div>
  );
};

export default SignupPage;
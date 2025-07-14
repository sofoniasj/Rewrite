import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import axios from 'axios'; // ✅ FIX: use axios directly
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Common/Modal';
import { FaSpinner } from 'react-icons/fa';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // ✅ FIX: moved hook outside of handleSubmit

  const recaptchaRef = useRef();
  const { signup, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const RECAPTCHA_SITE_KEY = "6LeKjF8rAAAAAK0UI00zgv_JntvqlPe8-kw72WvQ";

  useEffect(() => {
    clearError();
    setFormError('');
  }, [location, clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || '/');
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setFormError('You must agree to the terms and conditions.');
      return;
    }

    if (!captchaToken) {
      setFormError('Please complete the CAPTCHA verification.');
      return;
    }

    setActionLoading(true);

    try {
      const { data } = await axios.post(
        'https://rewriteb.onrender.com/api/auth/signup', // ✅ Replace with your backend URL if hosted
        {
          username,
          email,
          password,
          agreedToTerms,
          captchaToken,
        },
        { withCredentials: true }
      );

      setFormSuccess(data.message || 'Registration successful! Please check your email to verify your account.');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgreedToTerms(false);
      recaptchaRef.current.reset();
      setCaptchaToken(null);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Signup failed. Please try again.');
      recaptchaRef.current.reset();
      setCaptchaToken(null);
    } finally {
      setActionLoading(false);
    }
  };

  const openTermsModal = (e) => {
    e.preventDefault();
    setIsTermsModalOpen(true);
  };

  const closeTermsModal = () => setIsTermsModalOpen(false);

  return (
    <div className="auth-page card" style={{ maxWidth: '450px', margin: '2rem auto' }}>
      <h1 className="text-center card-title">Sign Up</h1>

      {formSuccess ? (
        <div className="success-message text-center" style={{ padding: '1rem', border: '1px solid #c3e6cb', borderRadius: '4px', backgroundColor: '#d4edda' }}>
          <p>{formSuccess}</p>
          <p>You can close this page.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {formError && <p className="error-message text-center">{formError}</p>}

          <div className="form-group">
            <label htmlFor="signup-username">Username</label>
            <input
              type="text"
              id="signup-username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength="3"
              maxLength="30"
              pattern="^[a-zA-Z0-9_]+$"
              title="Username must be 3-30 characters and contain only letters, numbers, and underscores."
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email Address</label>
            <input
              type="email"
              id="signup-email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              type="password"
              id="signup-password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={handleCaptchaChange} />
          </div>

          <div className="form-check">
            <input
              type="checkbox"
              id="terms"
              className="form-check-input"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
              disabled={loading}
            />
            <label htmlFor="terms" className="form-check-label">
              I agree to the{' '}
              <a href="#" onClick={openTermsModal}>
                Terms and Conditions
              </a>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading || actionLoading}>
            {actionLoading ? (
              <>
                <FaSpinner className="spin" style={{ marginRight: '5px' }} />
                Signing Up...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>
      )}

      {!formSuccess && (
        <p className="text-center my-1">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      )}

      <Modal isOpen={isTermsModalOpen} onClose={closeTermsModal} title="Terms and Conditions">
        <p>Welcome to Rewrite!</p>
        <p>By signing up and using our service, you agree to the following terms:</p>
        <ul>
          <li>You must provide accurate information during registration.</li>
          <li>Your username and email must be unique.</li>
          <li>You are responsible for maintaining the confidentiality of your password.</li>
          <li>We reserve the right to remove content or suspend accounts that violate these terms without notice.</li>
          <li>By accessing or using this website, you agree to be bound by these Terms. If you do not agree, do not use the site.</li>
          <li>We reserve the right to update these Terms at any time. Continued use of the website after changes constitutes your acceptance.</li>
          <li>You retain ownership of your content but grant us a license to use, display, and distribute it as needed for site functionality. You agree not to post illegal, harmful, or copyrighted material without permission.</li>
          <li>You may not:
- Use the site for unlawful purposes
- Attempt to hack or disrupt the platform
- Post abusive, hateful, or harmful content</li>
<li>We may suspend or terminate access to the site without notice if you violate these Terms.
</li>
      <li>These Terms and Conditions shall be governed in accordance with universally recognized principles of international law applicable to online platforms. By using this website, you agree to comply with all applicable local, national, and international laws and regulations, including those related to content, privacy, and intellectual property.
</li>

        </ul>
        <button onClick={closeTermsModal} className="btn btn-primary" style={{ marginTop: '15px' }}>
          Close
        </button>
      </Modal>
    </div>
  );
};

export default SignupPage;

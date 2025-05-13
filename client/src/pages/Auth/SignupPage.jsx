// Rewrite/client/src/pages/Auth/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal'; // We'll create this simple modal

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const { signup, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Clear errors when component mounts or location changes
  useEffect(() => {
    clearError();
    setPasswordError('');
  }, [location, clearError]);

   // Redirect if already logged in
   useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || '/'); // Redirect to previous page or home
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError(); // Clear context errors
    setPasswordError(''); // Clear local password mismatch error

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
        setPasswordError('You must agree to the terms and conditions to sign up.');
        return;
    }

    const success = await signup(username, password, agreedToTerms);
    // Navigation is handled within the signup function upon success
    if (!success) {
      // Handle signup failure (error state is updated in context)
       console.log("Signup failed from page");
    }
  };

  const openTermsModal = (e) => {
    e.preventDefault(); // Prevent link navigation
    setIsTermsModalOpen(true);
  }
  const closeTermsModal = () => setIsTermsModalOpen(false);

  return (
    <div className="auth-page card" style={{ maxWidth: '450px', margin: '2rem auto' }}>
      <h1 className="text-center card-title">Sign Up</h1>
      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}
      {passwordError && <p className="error-message text-center">{passwordError}</p>}
      <form onSubmit={handleSubmit}>
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
            pattern="^[a-zA-Z0-9_]+$" // Match backend validation
            title="Username must be 3-30 characters and contain only letters, numbers, and underscores."
            disabled={loading}
            autoComplete="username"
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
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !agreedToTerms}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      <p className="text-center my-1">
        Already have an account? <Link to="/login">Login</Link>
      </p>

      {/* Terms and Conditions Modal */}
      <Modal isOpen={isTermsModalOpen} onClose={closeTermsModal} title="Terms and Conditions">
          <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
          <p>Welcome to Rewrite!</p>
          <p>By signing up and using our service, you agree to the following terms:</p>
          <ul>
              <li>You must provide accurate information during registration.</li>
              <li>Your username must be unique and cannot be offensive.</li>
              <li>You are responsible for maintaining the confidentiality of your password.</li>
              <li>You will not post content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or invasive of another's privacy.</li>
              <li>Content you post must be original or you must have the rights to post it.</li>
              <li>We reserve the right to remove content or suspend accounts that violate these terms without notice.</li>
              <li>You grant Rewrite a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display the content you post solely for the purpose of operating and providing the Rewrite service.</li>
              <li>The "Like" and "Report" features should be used genuinely and not for manipulation or harassment.</li>
              <li>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</li>
              <li>This service is provided "as is" without warranties of any kind.</li>
          </ul>
          <p>Please use Rewrite responsibly.</p>
          <button onClick={closeTermsModal} className="btn btn-primary" style={{marginTop: '15px'}}>Close</button>
      </Modal>
    </div>
  );
};

export default SignupPage;

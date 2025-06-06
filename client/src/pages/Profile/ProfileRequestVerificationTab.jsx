// Rewrite/client/src/pages/Profile/ProfileRequestVerificationTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { FaCheckCircle, FaHourglassHalf, FaPaperPlane, FaSpinner } from 'react-icons/fa';

const ProfileRequestVerificationTab = () => {
  const { user, apiClient, fetchUserProfile } = useAuth();
  // Local state to manage request status, separate from the main user object for immediate feedback
  const [isVerified, setIsVerified] = useState(user?.isVerified || false);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState(user?.verificationRequestedAt || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Sync with global user state
    if (user) {
      setIsVerified(user.isVerified);
      setVerificationRequestedAt(user.verificationRequestedAt);
    }
  }, [user]);

  const handleRequestVerification = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await apiClient.post('/users/me/request-verification');
      setSuccessMessage(response.data.message || 'Verification request submitted successfully.');
      // Update local state to reflect request was made
      setVerificationRequestedAt(new Date().toISOString()); // Set to now
      // Re-fetch user profile to get the latest verificationRequestedAt from backend
      if (fetchUserProfile) {
        await fetchUserProfile(localStorage.getItem('rewriteToken'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit verification request.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  const canRequestVerification = !isVerified && 
                                 (!verificationRequestedAt || 
                                  (new Date() - new Date(verificationRequestedAt) > 1000 * 60 * 60 * 24 * 7)); // 7-day cooldown

  let statusMessage = "";
  let statusIcon = null;

  if (isVerified) {
    statusMessage = "Your account is verified.";
    statusIcon = <FaCheckCircle style={{ color: 'green', marginRight: '8px' }} />;
  } else if (verificationRequestedAt) {
    const sevenDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    if (new Date(verificationRequestedAt) > sevenDaysAgo) {
        statusMessage = `You have requested verification on ${new Date(verificationRequestedAt).toLocaleDateString()}. Please allow up to 7 days for review. You can request again after this period if not approved.`;
        statusIcon = <FaHourglassHalf style={{ color: 'orange', marginRight: '8px' }} />;
    } else {
        // Older request, not yet approved, can request again
        statusMessage = "Your previous verification request is older than 7 days. You can submit a new request.";
        statusIcon = <FaPaperPlane style={{ color: '#007bff', marginRight: '8px' }} />;
    }
  } else {
    statusMessage = "Your account is not verified. You can request verification.";
    statusIcon = <FaPaperPlane style={{ color: '#007bff', marginRight: '8px' }} />;
  }


  return (
    <div className="profile-verification-tab">
      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Account Verification</h3>
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          {statusIcon}
          <h4 style={{ marginTop: 0, marginBottom: 0 }}>Verification Status</h4>
        </div>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95em', color: '#555' }}>
          {statusMessage}
        </p>

        {!isVerified && canRequestVerification && (
          <button
            onClick={handleRequestVerification}
            className="btn btn-primary"
            disabled={loading}
            style={{minWidth:'180px'}}
          >
            {loading ? <><FaSpinner className="spin" style={{marginRight:'5px'}} />Submitting...</> : 'Request Verification'}
          </button>
        )}

        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
        {successMessage && <p className="success-message" style={{ marginTop: '1rem' }}>{successMessage}</p>}

        <div style={{marginTop:'1.5rem', paddingTop:'1rem', borderTop:'1px dashed #eee', fontSize:'0.85em', color:'#6c757d'}}>
            <p><strong>Why get verified?</strong></p>
            <ul style={{paddingLeft:'20px', margin:'0.5rem 0'}}>
                <li>A verification badge <FaCheckCircle style={{color:'dodgerblue'}}/> helps establish authenticity.</li>
                <li>It can increase trust within the community.</li>
                <li>Verification criteria are determined by platform administrators.</li>
            </ul>
            <p>Please ensure your profile information (like bio) is complete and accurate before requesting.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileRequestVerificationTab;

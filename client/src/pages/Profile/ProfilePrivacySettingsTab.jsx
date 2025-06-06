// Rewrite/client/src/pages/Profile/ProfilePrivacySettingsTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { FaLock, FaUnlock, FaSpinner } from 'react-icons/fa';

const ProfilePrivacySettingsTab = () => {
  const { user, apiClient, fetchUserProfile } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Ensure local state is synced with user context if user object changes
    if (user) {
      setIsPrivate(user.isPrivate);
    }
  }, [user]);

  const handlePrivacyToggle = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    const newPrivacyState = !isPrivate;
    try {
      const response = await apiClient.put('/users/me/privacy', { isPrivate: newPrivacyState });
      setIsPrivate(newPrivacyState); // Update local state on success
      setSuccessMessage(response.data.message || `Account privacy updated to ${newPrivacyState ? 'Private' : 'Public'}.`);
      // Re-fetch user profile to ensure AuthContext is up-to-date with the new privacy setting
      if (fetchUserProfile) {
        await fetchUserProfile(localStorage.getItem('rewriteToken'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update privacy settings.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoadingSpinner />; // Or a message indicating user data is not available
  }

  return (
    <div className="profile-privacy-settings-tab">
      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Privacy Settings</h3>
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ marginTop: 0, marginBottom: '0.25rem' }}>
              {isPrivate ? <FaLock style={{ marginRight: '8px', color: 'orange' }} /> : <FaUnlock style={{ marginRight: '8px', color: 'green' }} />}
              Account Privacy
            </h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
              Current status: <strong>{isPrivate ? 'Private' : 'Public'}</strong>
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85em', color: '#6c757d' }}>
              {isPrivate
                ? 'Your profile is private. Users will need to send you a follow request, and you must approve them to see your articles (unless an article is individually set to public) and full profile details.'
                : 'Your profile is public. Anyone can see your public articles and profile details. Users can follow you without approval.'}
            </p>
          </div>
          <button
            onClick={handlePrivacyToggle}
            className={`btn ${isPrivate ? 'btn-success' : 'btn-warning'}`}
            disabled={loading}
            style={{ minWidth: '150px' }}
          >
            {loading ? <FaSpinner className="spin" /> : (isPrivate ? 'Make Public' : 'Make Private')}
          </button>
        </div>
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
        {successMessage && <p className="success-message" style={{ marginTop: '1rem' }}>{successMessage}</p>}
        {isPrivate && (
             <p style={{ marginTop: '1rem', fontSize: '0.85em', color: '#6c757d', borderTop:'1px dashed #eee', paddingTop:'1rem' }}>
                <strong>Note:</strong> When your account is private, you can manage follow requests from your "Followers" tab.
                Articles can still be individually set to "Public" from the "Articles" tab if you want specific content to be visible to everyone.
            </p>
        )}
      </div>
    </div>
  );
};

export default ProfilePrivacySettingsTab;

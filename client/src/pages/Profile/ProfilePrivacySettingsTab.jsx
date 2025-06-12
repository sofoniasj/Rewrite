// Rewrite/client/src/pages/Profile/ProfilePrivacySettingsTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { FaLock, FaUnlock, FaSpinner } from 'react-icons/fa';

const ProfilePrivacySettingsTab = () => {
  const { user, loading: authLoading, apiClient, updateUserField } = useAuth();

  // Local state synced with user context
  const [isPrivate, setIsPrivate] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync local state with global user context when it changes
  useEffect(() => {
    if (user && typeof user.isPrivate === 'boolean') {
      setIsPrivate(user.isPrivate);
    }
  }, [user]);

  const handlePrivacyToggle = async () => {
    const newPrivacyState = !isPrivate;

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await apiClient.put('/users/me/privacy', {
        isPrivate: newPrivacyState,
      });

      const updatedPrivacy = response.data.isPrivate;

      setIsPrivate(updatedPrivacy);
      setSuccessMessage(response.data.message || 'Privacy setting updated successfully.');

      // Update global context
      if (updateUserField) {
        updateUserField('isPrivate', updatedPrivacy);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update privacy settings.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <p className="error-message text-center">Could not load user data.</p>;

  return (
    <div className="profile-privacy-settings-tab">
      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        Privacy Settings
      </h3>
      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h4 style={{ marginTop: 0, marginBottom: '0.25rem' }}>
              {isPrivate ? (
                <FaLock style={{ marginRight: '8px', color: '#dc3545' }} />
              ) : (
                <FaUnlock style={{ marginRight: '8px', color: '#28a745' }} />
              )}
              Account Privacy
            </h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
              Current status: <strong>{isPrivate ? 'Private' : 'Public'}</strong>
            </p>
          </div>
          <button
            onClick={handlePrivacyToggle}
            className={`btn ${isPrivate ? 'btn-success' : 'btn-warning'}`}
            disabled={actionLoading}
            style={{ minWidth: '150px' }}
          >
            {actionLoading ? <FaSpinner className="spin" /> : isPrivate ? 'Make Public' : 'Make Private'}
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85em', color: '#6c757d' }}>
            {isPrivate
              ? 'Your profile is private. Users must request to follow you, and you must approve them before they can see your followers-only content.'
              : 'Your profile is public. Anyone can see your public articles and follow you without approval.'}
          </p>
        </div>

        {error && (
          <p className="error-message" style={{ marginTop: '1rem' }}>
            {error}
          </p>
        )}
        {successMessage && (
          <p className="success-message" style={{ marginTop: '1rem' }}>
            {successMessage}
          </p>
        )}

        {isPrivate && (
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.85em',
              color: '#6c757d',
              borderTop: '1px dashed #eee',
              paddingTop: '1rem',
            }}
          >
            <strong>Note:</strong> You can manage pending follow requests in your "Followers" tab.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfilePrivacySettingsTab;

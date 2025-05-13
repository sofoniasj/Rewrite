// Rewrite/client/src/components/Content/VersionSelector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { FaThumbsUp } from 'react-icons/fa';

const VersionSelector = ({ contentId, onSelectVersion, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  const fetchVersions = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/content/${contentId}/versions`);
      setVersions(data || []);
    } catch (err) {
      console.error("Failed to fetch versions:", err);
      setError(err.response?.data?.error || "Could not load alternative versions.");
    } finally {
      setLoading(false);
    }
  }, [contentId, apiClient]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleVersionClick = (versionId) => {
    if (onSelectVersion) {
      onSelectVersion(versionId);
    }
  };

  return (
    <div className="version-selector card" style={{marginTop: '1rem'}}>
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
           <h4>Alternative Versions</h4>
           <button onClick={onClose} className="btn btn-link" style={{padding: '0', fontSize: '1rem'}}>&times; Close</button>
       </div>

      {loading && <LoadingSpinner />}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && versions.length > 0 && (
        <ul>
          {versions.map(version => (
            <li key={version.id} onClick={() => handleVersionClick(version.id)} title="Click to view this version's path">
              <p style={{ margin: 0 }}>{version.text.substring(0, 100)}{version.text.length > 100 ? '...' : ''}</p>
              <small className="version-meta">
                By {version.author?.username || 'Unknown'} •{' '}
                {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })} •{' '}
                <FaThumbsUp size="0.8em" style={{verticalAlign: 'baseline'}}/> {version.likeCount} likes
              </small>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && versions.length === 0 && (
        <p>No alternative versions found for this segment.</p>
      )}
    </div>
  );
};

export default VersionSelector;

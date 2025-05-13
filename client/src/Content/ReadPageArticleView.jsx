// Rewrite/client/src/components/Content/ReadPageArticleView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VersionSelector from './VersionSelector'; // We'll create this next
import LoadingSpinner from '../Common/LoadingSpinner';
import { format } from 'date-fns';
import { FaThumbsUp } from 'react-icons/fa';

const ReadPageArticleView = ({ initialLineage, rootArticleId, onLineageUpdate }) => {
  const [currentLineage, setCurrentLineage] = useState(initialLineage || []);
  const [selectedSegment, setSelectedSegment] = useState({ contentId: null, depth: -1 });
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState(null);
  const { apiClient } = useAuth();

  // Update local state if initialLineage prop changes (e.g., navigating between articles)
  useEffect(() => {
    setCurrentLineage(initialLineage || []);
    setSelectedSegment({ contentId: null, depth: -1 }); // Reset selection when lineage changes
  }, [initialLineage]);

  // Define colors for segments
  const segmentColors = [
    '#eef2f7', // Light Blue/Gray
    '#fef9e7', // Light Yellow
    '#eaf7e9', // Light Green
    '#fbeee6', // Light Orange/Peach
    '#e8f8f5', // Light Teal
    '#f4ecf7', // Light Purple
  ];

  const handleSegmentClick = (content, index) => {
    // Don't allow selecting the root article (index 0) for version change
    if (index === 0) {
       setSelectedSegment({ contentId: null, depth: -1 }); // Clear selection
       return;
    }
    // Toggle selection: if clicking the same segment, hide selector, otherwise show for the new one
    if (selectedSegment.contentId === content.id) {
      setSelectedSegment({ contentId: null, depth: -1 });
    } else {
      setSelectedSegment({ contentId: content.id, depth: index });
    }
    setVersionError(null); // Clear previous version errors
  };

  const handleSelectVersion = async (selectedVersionId, originalDepth) => {
    setLoadingVersions(true);
    setVersionError(null);
    setSelectedSegment({ contentId: null, depth: -1 }); // Hide selector after selection attempt

    try {
      // Fetch the new lineage starting from the selected version's ID
      const { data: newPartialLineage } = await apiClient.get(`/content/${selectedVersionId}/lineage`);

      if (!newPartialLineage || newPartialLineage.length === 0) {
          throw new Error("Could not construct lineage from selected version.");
      }

      // Reconstruct the full lineage: take the old lineage up to the original depth,
      // then append the new partial lineage.
      const newLineage = [
          ...currentLineage.slice(0, originalDepth), // Keep parts before the change
          ...newPartialLineage                   // Add the new selected path onwards
      ];

      setCurrentLineage(newLineage); // Update local state
      if (onLineageUpdate) {
          onLineageUpdate(newLineage); // Update parent state if needed
      }

    } catch (err) {
      console.error("Failed to update lineage with selected version:", err);
      setVersionError(err.response?.data?.error || "Failed to load selected version's lineage.");
    } finally {
      setLoadingVersions(false);
    }
  };

  if (!currentLineage || currentLineage.length === 0) {
    return <p>No content to display.</p>;
  }

  const rootArticle = currentLineage[0];

  return (
    <div className="card read-page-view">
      {rootArticle.title && <h1 className="card-title" style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>{rootArticle.title}</h1>}

      {versionError && <p className="error-message">{versionError}</p>}
      {loadingVersions && <LoadingSpinner />}

      <div className="concatenated-content">
        {currentLineage.map((content, index) => (
          <React.Fragment key={content.id}>
            <span
              className="lineage-segment"
              style={{
                backgroundColor: segmentColors[index % segmentColors.length],
                border: selectedSegment.contentId === content.id ? '2px solid #007bff' : '1px solid rgba(0,0,0,0.1)', // Highlight selected
              }}
              onClick={() => handleSegmentClick(content, index)}
              title={`By ${content.author?.username || 'Unknown'} - ${content.likeCount} likes - Click to see versions (if available)`}
            >
              {content.text}
            </span>
            {/* Add a small visual separator maybe? */}
            {index < currentLineage.length - 1 && <span style={{margin: '0 2px'}}> </span>}
          </React.Fragment>
        ))}
      </div>

      {/* Display metadata about the full lineage */}
      <div className="card-meta" style={{marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
          <p>
              <strong>Author:</strong> {rootArticle.author?.username || 'Unknown'} |{' '}
              <strong>Posted:</strong> {format(new Date(rootArticle.createdAt), 'PPP p')} |{' '}
              <strong>Likes:</strong> <FaThumbsUp size="0.8em" style={{verticalAlign: 'baseline'}}/> {rootArticle.likeCount}
          </p>
          {currentLineage.length > 1 && (
              <p style={{fontSize: '0.9em', color: '#555'}}>
                  Showing top-liked path ({currentLineage.length - 1} {currentLineage.length === 2 ? 'reply' : 'replies'}). Click colored segments to explore alternatives.
             </p>
          )}
      </div>


      {/* Render Version Selector if a segment is selected */}
      {selectedSegment.contentId && (
        <VersionSelector
          contentId={selectedSegment.contentId}
          onSelectVersion={(selectedId) => handleSelectVersion(selectedId, selectedSegment.depth)}
          onClose={() => setSelectedSegment({ contentId: null, depth: -1 })} // Allow closing the selector
        />
      )}
    </div>
  );
};

export default ReadPageArticleView;

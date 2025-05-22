// Rewrite/client/src/components/Content/ReadPageArticleView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VersionSelector from './VersionSelector';
import LoadingSpinner from '../Common/LoadingSpinner';
import ArticleForm from './ArticleForm';
import { format, formatDistanceToNow } from 'date-fns';
import { FaThumbsUp, FaRegThumbsUp, FaReply, FaSpinner, FaFlag, FaListUl, FaTimes, FaEdit, FaSave, FaWindowClose } from 'react-icons/fa';

// --- Simplified LineageSegment Sub-Component ---
// Now primarily for display and click handling to select it for actions in the parent.
const LineageSegmentDisplay = ({ content, color, onSegmentClick, isActiveForActions }) => {
    return (
        <span // Changed from div to span for better inline-block flow if desired, or keep div
            className="lineage-segment" // Keep general class for styling
            style={{
                backgroundColor: color,
                border: isActiveForActions ? '3px solid #0056b3' : '1px solid rgba(0,0,0,0.1)', // Highlight active
                padding: '8px 12px',
                margin: '4px 2px',
                display: 'inline-block',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease-in-out, transform 0.1s ease',
                boxShadow: isActiveForActions ? '0 0 8px rgba(0,86,179,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                transform: isActiveForActions ? 'scale(1.02)' : 'scale(1)',
            }}
            onClick={() => onSegmentClick(content)}
            title={`Click to select this segment for actions: "${content.text.substring(0, 50)}..."`}
        >
            {content.text}
        </span>
    );
};
// --- End of LineageSegmentDisplay Component ---


const ReadPageArticleView = ({ initialLineage, rootArticleId, onLineageUpdate }) => {
  const [currentLineage, setCurrentLineage] = useState(initialLineage || []);
  const [activeSegmentForActions, setActiveSegmentForActions] = useState(null); // Holds the *full object* of the clicked segment
  const [showVersionSelectorFor, setShowVersionSelectorFor] = useState(null); // Holds the *full object* of segment for VersionSelector
  
  const [isReplyingToActiveSegment, setIsReplyingToActiveSegment] = useState(false);
  const [isEditingActiveSegment, setIsEditingActiveSegment] = useState(false);

  const [loading, setLoading] = useState(false); // General loading for lineage refreshes
  const [actionLoading, setActionLoading] = useState({ type: null, id: null }); // For specific button loading states
  const [error, setError] = useState(null);
  const { apiClient, user, isAuthenticated } = useAuth();

  useEffect(() => {
    setCurrentLineage(initialLineage || []);
    setActiveSegmentForActions(null);
    setShowVersionSelectorFor(null);
    setIsReplyingToActiveSegment(false);
    setIsEditingActiveSegment(false);
  }, [initialLineage]);

  const segmentColors = ['#eef2f7', '#fef9e7', '#eaf7e9', '#fbeee6', '#e8f8f5', '#f4ecf7'];

  const handleSegmentClick = (segment) => {
    if (activeSegmentForActions?.id === segment.id) {
      // Clicking the same active segment again could toggle its action panel off, or do nothing
      // For now, let's allow re-clicking to re-focus, but not toggle off.
      // To toggle off, user would click elsewhere or a close button.
      // setActiveSegmentForActions(null); // Option to toggle off
    } else {
      setActiveSegmentForActions(segment);
    }
    // Close other forms/selectors if a new segment is selected for actions
    setIsReplyingToActiveSegment(false);
    setIsEditingActiveSegment(false);
    setShowVersionSelectorFor(null);
  };

  const refreshFullLineage = useCallback((highlightSegmentId = null) => {
    if (!rootArticleId) return;
    setLoading(true);
    apiClient.get(`/content/${rootArticleId}/lineage`)
      .then(response => {
        const refreshedLineage = response.data || [];
        setCurrentLineage(refreshedLineage);
        if (onLineageUpdate) onLineageUpdate(refreshedLineage);
        // If a segment was just updated/replied to, re-select it
        if (highlightSegmentId) {
            const newActiveSegment = refreshedLineage.find(s => s.id === highlightSegmentId);
            if (newActiveSegment) setActiveSegmentForActions(newActiveSegment);
        }
      })
      .catch(err => { console.error("Error refreshing lineage:", err); setError("Could not refresh content."); })
      .finally(() => setLoading(false));
  }, [apiClient, rootArticleId, onLineageUpdate]);

  // --- Actions for the activeSegmentForActions ---
  const handleLikeActiveSegment = async () => {
    if (!activeSegmentForActions || !isAuthenticated) return;
    setActionLoading({ type: 'like', id: activeSegmentForActions.id });
    try {
        const { data } = await apiClient.post(`/content/${activeSegmentForActions.id}/like`);
        const updatedSegment = { ...activeSegmentForActions, likeCount: data.likeCount, likes: data.likes };
        setActiveSegmentForActions(updatedSegment); // Update the active segment's data
        handleSegmentDataChangeInLineage(updatedSegment); // Update in the main lineage array
    } catch (err) { alert(err.response?.data?.error || "Like failed."); }
    finally { setActionLoading({ type: null, id: null }); }
  };

  const handleReportActiveSegment = async () => {
    if (!activeSegmentForActions || !isAuthenticated) return;
    if (activeSegmentForActions.reports?.some(r => r.reporter === user.id || r.reporter?._id === user.id)) {
        alert("You have already reported this segment.");
        return;
    }
    setActionLoading({ type: 'report', id: activeSegmentForActions.id });
    try {
        const { data } = await apiClient.post(`/content/${activeSegmentForActions.id}/report`, { reason: "Reported from active segment actions" });
        const updatedSegment = { ...activeSegmentForActions, isReported: data.isReported, reports: [...(activeSegmentForActions.reports || []), {reporter: user.id}] };
        setActiveSegmentForActions(updatedSegment);
        handleSegmentDataChangeInLineage(updatedSegment);
        alert("Segment reported.");
    } catch (err) { alert(err.response?.data?.error || "Report failed."); }
    finally { setActionLoading({ type: null, id: null }); }
  };

  const handleReplyToActiveSegmentSuccess = (newReply) => {
    setIsReplyingToActiveSegment(false);
    refreshFullLineage(activeSegmentForActions?.id); // Refresh and try to keep current segment active
  };

  const handleEditActiveSegmentSuccess = (updatedContent) => {
    setIsEditingActiveSegment(false);
    setActiveSegmentForActions(updatedContent); // Update active segment
    handleSegmentDataChangeInLineage(updatedContent); // Update in main lineage
  };
  
  // Generic handler to update a segment's data in the main currentLineage array
  const handleSegmentDataChangeInLineage = (updatedSegmentData) => {
      const updatedLineage = currentLineage.map(segment =>
        segment.id === updatedSegmentData.id ? { ...segment, ...updatedSegmentData } : segment
      );
      setCurrentLineage(updatedLineage);
      if (onLineageUpdate) onLineageUpdate(updatedLineage);
  };

  // Called by VersionSelector when a version is chosen to be part of the main lineage
  const handleSelectVersionFromSelector = async (selectedVersionId) => {
    if (!showVersionSelectorFor) return setError("Error: Context for version selection is missing.");
    const originalDepth = currentLineage.findIndex(s => s.id === showVersionSelectorFor.id);
    if (originalDepth === -1) return setError("Error: Original segment depth not found.");

    setLoading(true); setError(null);
    const prevContextId = showVersionSelectorFor.id;
    setShowVersionSelectorFor(null); // Close VersionSelector

    try {
      const { data: newPartialLineage } = await apiClient.get(`/content/${selectedVersionId}/lineage`);
      if (!newPartialLineage || newPartialLineage.length === 0) throw new Error("Could not construct new path.");
      const newLineage = [ ...currentLineage.slice(0, originalDepth), ...newPartialLineage ];
      setCurrentLineage(newLineage);
      setActiveSegmentForActions(newPartialLineage[0]); // Make the newly selected version active
      if (onLineageUpdate) onLineageUpdate(newLineage);
    } catch (err) {
      console.error("Failed to update lineage (ReadPageArticleView):", err);
      setError(err.response?.data?.error || "Failed to load selected version's lineage.");
    } finally { setLoading(false); }
  };


  if (!currentLineage || currentLineage.length === 0) {
    return <p className="text-center my-2">No content to display for this article lineage.</p>;
  }
  const rootArticle = currentLineage[0];
  const isAuthorOfActiveSegment = isAuthenticated && activeSegmentForActions && user?.id === activeSegmentForActions.author?.id;

  return (
    <div className="interactive-read-page-view"> {/* New main class */}
      {rootArticle.title && (<h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', fontSize: '1.8rem' }}>{rootArticle.title}</h1>)}
      {error && <p className="error-message text-center">{error}</p>}
      {loading && <LoadingSpinner />}

      {/* Concatenated Lineage Display */}
      <div className="concatenated-lineage-display card" style={{padding: '15px', marginBottom: '20px', background:'#fff'}}>
        {currentLineage.map((content, index) => (
          <LineageSegmentDisplay
            key={content.id + '-' + content.updatedAt} // Key needs to be stable but reactive
            content={content}
            color={segmentColors[index % segmentColors.length]}
            onSegmentClick={handleSegmentClick}
            isActiveForActions={activeSegmentForActions?.id === content.id}
          />
        ))}
      </div>

      {/* Metadata about the full lineage */}
      <div className="lineage-metadata card-meta" style={{ marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '4px', border:'1px solid #eee' }}>
          <p style={{margin:0}}>
              <strong>Author:</strong> {rootArticle.author?.username || 'Unknown'} |{' '}
              <strong>Posted:</strong> {format(new Date(rootArticle.createdAt), 'PPP p')} |{' '}
              <strong>Likes:</strong> <FaThumbsUp size="0.8em" style={{verticalAlign: 'baseline'}}/> {rootArticle.likeCount}
          </p>
          {currentLineage.length > 1 && (
              <p style={{fontSize: '0.9em', color: '#555', margin:'5px 0 0 0'}}>
                  Showing top-liked path ({currentLineage.length - 1} {currentLineage.length === 2 ? 'reply' : 'replies'}). Click a colored segment above to select it for actions below.
             </p>
          )}
      </div>

      {/* --- Central Actions Panel for the Active Segment --- */}
      {activeSegmentForActions && !showVersionSelectorFor && (
        <div className="active-segment-actions-panel card" style={{padding: '15px', marginBottom: '20px', background:'#fff', border:'2px solid #007bff'}}>
            <h5 style={{marginTop:0, marginBottom:'10px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                Actions for selected segment: <em style={{fontWeight:400, color:'#555'}}>"{activeSegmentForActions.text.substring(0,70)}..."</em>
            </h5>

            {/* Like, Report, Reply, Edit buttons */}
            <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginBottom: isReplyingToActiveSegment || isEditingActiveSegment ? '15px' : '0'}}>
                <button onClick={handleLikeActiveSegment} className="btn btn-sm btn-outline-primary" disabled={!isAuthenticated || actionLoading.type === 'like'}>
                    {actionLoading.type === 'like' ? <FaSpinner className="icon spin"/> : (activeSegmentForActions.likes?.some(l => l === user?.id || l.id === user?.id) ? <FaThumbsUp/> : <FaRegThumbsUp/>)}
                    Like ({activeSegmentForActions.likeCount || 0})
                </button>
                <button onClick={handleReportActiveSegment} className="btn btn-sm btn-outline-danger" disabled={!isAuthenticated || actionLoading.type === 'report' || activeSegmentForActions.reports?.some(r => r.reporter === user?.id || r.reporter?._id === user?.id)}>
                    {actionLoading.type === 'report' ? <FaSpinner className="icon spin"/> : <FaFlag/>}
                    {activeSegmentForActions.reports?.some(r => r.reporter === user?.id || r.reporter?._id === user?.id) ? 'Reported by You' : 'Report'}
                </button>
                {isAuthenticated && (
                    <button onClick={() => { setIsReplyingToActiveSegment(true); setIsEditingActiveSegment(false); }} className="btn btn-sm btn-outline-secondary" disabled={isReplyingToActiveSegment}>
                        <FaReply/> Reply
                    </button>
                )}
                {isAuthorOfActiveSegment && (
                    <button onClick={() => { setIsEditingActiveSegment(true); setIsReplyingToActiveSegment(false); }} className="btn btn-sm btn-outline-info" disabled={isEditingActiveSegment}>
                        <FaEdit/> Edit
                    </button>
                )}
                {/* Button to show sibling versions - only for non-root segments */}
                {activeSegmentForActions.parentContent && (
                    <button onClick={() => setShowVersionSelectorFor(activeSegmentForActions)} className="btn btn-sm btn-outline-success">
                        <FaListUl/> View/Manage Sibling Versions
                    </button>
                )}
            </div>

            {/* Reply Form for Active Segment */}
            {isReplyingToActiveSegment && (
                <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc'}}>
                    <h6 style={{marginTop:0, marginBottom:'10px'}}>Your Reply:</h6>
                    <ArticleForm
                        parentContentId={activeSegmentForActions.id}
                        onPostSuccess={handleReplyToActiveSegmentSuccess}
                        onCancel={() => setIsReplyingToActiveSegment(false)}
                    />
                </div>
            )}

            {/* Edit Form for Active Segment */}
            {isEditingActiveSegment && isAuthorOfActiveSegment && (
                 <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc'}}>
                    <h6 style={{marginTop:0, marginBottom:'10px'}}>Editing Segment:</h6>
                    <ArticleForm
                        isEditMode={true}
                        contentToEdit={activeSegmentForActions}
                        onEditSuccess={handleEditActiveSegmentSuccess}
                        onCancel={() => setIsEditingActiveSegment(false)}
                    />
                </div>
            )}
        </div>
      )}


      {/* VersionSelector - shown when showVersionSelectorFor is set */}
      {showVersionSelectorFor && (
        <VersionSelector
          contextSegment={showVersionSelectorFor} // The segment whose siblings are being viewed/managed
          onSelectVersion={handleSelectVersionFromSelector} // When a SIBLING is chosen to replace contextSegment in lineage
          onClose={() => setShowVersionSelectorFor(null)}
          onContextSegmentUpdate={handleSegmentDataChangeInLineage} // When contextSegment itself is L/R/Replied to from INSIDE VersionSelector
          onNewVariationAdded={() => refreshFullLineage(showVersionSelectorFor.id)} // When a NEW SIBLING is added from INSIDE VersionSelector
        />
      )}
    </div>
  );
};

export default ReadPageArticleView;

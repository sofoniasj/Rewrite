// Rewrite/client/src/components/Content/ReadPageArticleView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VersionSelector from './VersionSelector';
import LoadingSpinner from '../Common/LoadingSpinner';
import ArticleForm from './ArticleForm';
import { format, formatDistanceToNow } from 'date-fns';
import { FaThumbsUp, FaRegThumbsUp, FaReply, FaSpinner, FaFlag, FaListUl, FaTimes } from 'react-icons/fa';

// --- LineageSegment Component Definition ---
const LineageSegment = ({
  content, color, onLikeThisSegment, onReportThisSegment,
  onToggleReplyFormForThisSegment, isReplyingToThisSegment, onReplySuccessToThisSegment, onCancelReply,
  onShowSiblingVersionsForThisSegment, isVersionSelectorOpenForThisSegment,
}) => {
    const { isAuthenticated, user, apiClient } = useAuth();
    const [actionsPanelOpen, setActionsPanelOpen] = useState(false);
    const [localLikeStatus, setLocalLikeStatus] = useState({ count: content.likeCount, likedByUser: false });
    const [localReportStatus, setLocalReportStatus] = useState({ isReported: content.isReported || false, reportedByUser: false });
    const [loadingLike, setLoadingLike] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        setLocalLikeStatus({
            count: content.likeCount,
            likedByUser: isAuthenticated && content.likes ? content.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) : false
        });
        setLocalReportStatus({
            isReported: content.isReported || false,
            reportedByUser: isAuthenticated && content.reports ? content.reports.some(report => (report.reporter === user?.id || report.reporter?._id === user?.id)) : false
        });
    }, [content, isAuthenticated, user]);

    const handleMainSegmentClick = (e) => {
        if (e.target.closest('button, a, form, input, textarea')) return;
        setActionsPanelOpen(prev => !prev);
        if (!actionsPanelOpen && isVersionSelectorOpenForThisSegment) {
            onShowSiblingVersionsForThisSegment(content.id, false); // Request parent to close VersionSelector
        }
    };

    const handleLikeBtnClick = async (e) => {
        e.stopPropagation();
        if (!isAuthenticated) return alert("Please log in to like.");
        setLoadingLike(true);
        try {
            const { data } = await apiClient.post(`/content/${content.id}/like`);
            setLocalLikeStatus({ count: data.likeCount, likedByUser: data.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) });
            if(onLikeThisSegment) onLikeThisSegment(content.id, data);
        } catch (err) { console.error("Failed to like segment:", err); alert(err.response?.data?.error || "Like failed.");
        } finally { setLoadingLike(false); }
    };

    const handleReportBtnClick = async (e) => {
        e.stopPropagation();
        if (!isAuthenticated) return alert("Please log in to report.");
        if (localReportStatus.isReported && localReportStatus.reportedByUser) return alert("You have already reported this.");
        if (localReportStatus.isReported && !localReportStatus.reportedByUser) return alert("This content has already been flagged.");
        setLoadingReport(true);
        try {
            const { data } = await apiClient.post(`/content/${content.id}/report`, { reason: "Reported from lineage view" });
            setLocalReportStatus({ isReported: data.isReported, reportedByUser: true });
            alert("Content reported.");
            if(onReportThisSegment) onReportThisSegment(content.id, data);
        } catch (err) { console.error("Failed to report segment:", err); alert(err.response?.data?.error || "Report failed.");
        } finally { setLoadingReport(false); }
    };

    const handleReplyToThisBtnClick = (e) => {
        e.stopPropagation();
        onToggleReplyFormForThisSegment(content.id);
        setActionsPanelOpen(false);
    };

    const handleShowVersionsBtnClick = (e) => {
        e.stopPropagation();
        // This tells ReadPageArticleView to set the context for VersionSelector
        onShowSiblingVersionsForThisSegment(content.id, true);
        setActionsPanelOpen(false);
    };

    return (
        <div
            className="lineage-segment card"
            style={{ backgroundColor: color, border: (actionsPanelOpen || isVersionSelectorOpenForThisSegment || isReplyingToThisSegment) ? '2px solid #007bff' : '1px solid rgba(0,0,0,0.1)', marginBottom: '10px', padding: '15px'}}
            onClick={handleMainSegmentClick}
        >
            <div style={{cursor: 'pointer', marginBottom: (actionsPanelOpen || isReplyingToThisSegment) ? '10px' : '0'}}>
                <p style={{ margin: 0 }}>{content.text}</p>
                <small className="version-meta" style={{ display: 'block', marginTop: '5px', color: '#555' }}>
                    By {content.author?.username || 'Unknown'} • {formatDistanceToNow(new Date(content.createdAt), { addSuffix: true })}
                </small>
            </div>
            {actionsPanelOpen && !isReplyingToThisSegment && !isVersionSelectorOpenForThisSegment && (
                <div className="segment-actions-panel" style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc', background: 'rgba(255,255,255,0.8)', padding: '10px', borderRadius:'4px'}}>
                    <button onClick={handleLikeBtnClick} className="btn btn-sm btn-link" disabled={!isAuthenticated || loadingLike}>
                        {loadingLike ? <FaSpinner className="icon spin" /> : (localLikeStatus.likedByUser ? <FaThumbsUp className="icon" color="blue"/> : <FaRegThumbsUp className="icon"/>)} Like ({localLikeStatus.count})
                    </button>
                    <button onClick={handleReportBtnClick} className="btn btn-sm btn-link" disabled={!isAuthenticated || loadingReport || (localReportStatus.isReported && localReportStatus.reportedByUser)}>
                        {loadingReport ? <FaSpinner className="icon spin" /> : <FaFlag className="icon" />} {(localReportStatus.isReported && localReportStatus.reportedByUser) ? 'You Reported' : (localReportStatus.isReported ? 'Flagged' : 'Report')}
                    </button>
                    {isAuthenticated && (<button onClick={handleReplyToThisBtnClick} className="btn btn-sm btn-link"><FaReply className="icon" /> Reply to this</button>)}
                    {content.parentContent && (<button onClick={handleShowVersionsBtnClick} className="btn btn-sm btn-link"><FaListUl className="icon" /> View Sibling Versions</button>)}
                    <button onClick={(e) => {e.stopPropagation(); setActionsPanelOpen(false);}} className="btn btn-sm btn-link" style={{float: 'right', color: '#888'}} title="Close actions"><FaTimes /></button>
                </div>
            )}
            {isReplyingToThisSegment && (
                <div style={{marginTop: '1rem', padding: '10px', background: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee'}}>
                    <h6 style={{marginTop:0, marginBottom:'10px'}}>Replying to: "{content.text.substring(0,30)}..."</h6>
                    <ArticleForm parentContentId={content.id} onPostSuccess={onReplySuccessToThisSegment} onCancel={() => onCancelReply(content.id)} />
                </div>
            )}
        </div>
    );
};
// --- End of LineageSegment Component ---

const ReadPageArticleView = ({ initialLineage, rootArticleId, onLineageUpdate }) => {
  const [currentLineage, setCurrentLineage] = useState(initialLineage || []);
  // THIS STATE IS CRUCIAL: It holds the *full object* of the segment for VersionSelector
  const [contextSegmentForVersionSelector, setContextSegmentForVersionSelector] = useState(null);
  const [replyingToSegmentId, setReplyingToSegmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  useEffect(() => {
    setCurrentLineage(initialLineage || []);
    setContextSegmentForVersionSelector(null); // Reset when lineage changes
    setReplyingToSegmentId(null);
  }, [initialLineage]);

  const segmentColors = ['#eef2f7', '#fef9e7', '#eaf7e9', '#fbeee6', '#e8f8f5', '#f4ecf7'];

  // Called by LineageSegment when its "View Sibling Versions" button is clicked
  const handleShowSiblingVersionsForSegment = (segmentIdClicked, show) => {
    const segmentObject = currentLineage.find(s => s.id === segmentIdClicked);

    if (show && segmentObject && segmentObject.parentContent) {
        console.log("ReadPageArticleView: Setting context segment for VersionSelector:", segmentObject); // DEBUG LOG
        setContextSegmentForVersionSelector(segmentObject); // Pass the whole segment object
        setReplyingToSegmentId(null); // Close any open reply form
    } else {
        console.log("ReadPageArticleView: Clearing context segment for VersionSelector."); // DEBUG LOG
        setContextSegmentForVersionSelector(null);
    }
  };

  const handleSelectVersionForLineage = async (selectedVersionId) => {
    if (!contextSegmentForVersionSelector) {
        console.error("Error: Context segment for version selection is missing when trying to select version.");
        setError("An error occurred while updating the lineage (missing context).");
        return;
    }
    const originalDepth = currentLineage.findIndex(s => s.id === contextSegmentForVersionSelector.id);
    if (originalDepth === -1) {
        console.error("Error: Cannot determine depth of original segment for version selection.");
        setError("An error occurred while updating the lineage (cannot find original depth).");
        return;
    }

    setLoading(true);
    setError(null);
    const previousContextSegmentId = contextSegmentForVersionSelector.id; // Save for logging
    setContextSegmentForVersionSelector(null); // Close VersionSelector

    try {
      const { data: newPartialLineage } = await apiClient.get(`/content/${selectedVersionId}/lineage`);
      if (!newPartialLineage || newPartialLineage.length === 0) {
        throw new Error("Could not construct new lineage path from selected version.");
      }
      const newLineage = [ ...currentLineage.slice(0, originalDepth), ...newPartialLineage ];
      setCurrentLineage(newLineage);
      if (onLineageUpdate) onLineageUpdate(newLineage);
      console.log(`ReadPageArticleView: Lineage updated with version ${selectedVersionId} for original segment ${previousContextSegmentId}`); // DEBUG LOG
    } catch (err) {
      console.error("Failed to update lineage with selected version:", err);
      setError(err.response?.data?.error || "Failed to load selected version's lineage.");
    } finally { setLoading(false); }
  };

  const handleContextSegmentUpdateInParent = (updatedSegmentData) => {
      console.log("ReadPageArticleView: Context segment updated from VersionSelector:", updatedSegmentData); // DEBUG LOG
      const updatedLineage = currentLineage.map(segment =>
        segment.id === updatedSegmentData.id ? { ...segment, ...updatedSegmentData } : segment
      );
      setCurrentLineage(updatedLineage);
      if (onLineageUpdate) onLineageUpdate(updatedLineage);

      if (updatedSegmentData.action === 'reply_to_context_in_versions') {
          refreshMainLineage();
      }
  };
  
  const refreshMainLineage = useCallback(() => {
    console.log("ReadPageArticleView: Refreshing main lineage for root:", rootArticleId); // DEBUG LOG
    setLoading(true);
    apiClient.get(`/content/${rootArticleId}/lineage`)
      .then(response => {
        const refreshedLineage = response.data || [];
        setCurrentLineage(refreshedLineage);
        if (onLineageUpdate) onLineageUpdate(refreshedLineage);
      })
      .catch(err => {
        console.error("Error refreshing lineage:", err);
        setError("Could not refresh content. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, [apiClient, rootArticleId, onLineageUpdate]);


  const handleToggleReplyFormForSegment = (segmentId) => {
    setReplyingToSegmentId(prevId => (prevId === segmentId ? null : segmentId));
    if (replyingToSegmentId !== segmentId) {
        setContextSegmentForVersionSelector(null);
    }
  };

  const handleReplySuccessToSegment = (newReply) => {
    setReplyingToSegmentId(null);
    refreshMainLineage();
  };


  if (!currentLineage || currentLineage.length === 0) {
    return <p className="text-center my-2">No content to display for this article.</p>;
  }
  const rootArticle = currentLineage[0];

  return (
    <div className="read-page-view">
      {rootArticle.title && (
        <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', fontSize: '1.8rem' }}>
          {rootArticle.title}
        </h1>
      )}
      {error && <p className="error-message text-center">{error}</p>}
      {loading && <LoadingSpinner />}

      <div className="concatenated-content-segments">
        {currentLineage.map((content, index) => (
          <LineageSegment
            key={content.id + '-' + (content.updatedAt || content.createdAt) + '-' + (content.likes?.length || 0) + '-' + (content.reports?.length || 0)}
            content={content}
            color={segmentColors[index % segmentColors.length]}
            onLikeThisSegment={handleContextSegmentUpdateInParent} 
            onReportThisSegment={handleContextSegmentUpdateInParent} 
            onToggleReplyFormForThisSegment={handleToggleReplyFormForSegment}
            isReplyingToThisSegment={replyingToSegmentId === content.id}
            onReplySuccessToThisSegment={handleReplySuccessToSegment}
            onCancelReply={() => setReplyingToSegmentId(null)}
            onShowSiblingVersionsForThisSegment={handleShowSiblingVersionsForSegment}
            isVersionSelectorOpenForThisSegment={contextSegmentForVersionSelector?.id === content.id}
          />
        ))}
      </div>

      <div className="card-meta" style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
        <p><strong>Original Author:</strong> {rootArticle.author?.username || 'Unknown'} | <strong>Posted:</strong> {format(new Date(rootArticle.createdAt), 'PPP p')}</p>
        {currentLineage.length > 1 && (
          <p style={{ fontSize: '0.9em', color: '#555' }}>
            Showing a top-liked path ({currentLineage.length - 1} {currentLineage.length === 2 ? 'reply' : 'replies'}).
            Click a segment to interact or view sibling versions.
          </p>
        )}
        {currentLineage.length === 1 && (
          <p style={{ fontSize: '0.9em', color: '#555' }}>This article has no replies in the current top-liked path.</p>
        )}
      </div>

      {/* VersionSelector is rendered if contextSegmentForVersionSelector is set */}
      {contextSegmentForVersionSelector && (
        <VersionSelector
        
          contextSegment={contextSegmentForVersionSelector} // Pass the full segment object
          onSelectVersion={handleSelectVersionForLineage}
          onClose={() => setContextSegmentForVersionSelector(null)}
          onContextSegmentUpdate={handleContextSegmentUpdateInParent} 
          onNewVariationAdded={refreshMainLineage} 
        />
      )}
    </div>
  );
};

export default ReadPageArticleView;

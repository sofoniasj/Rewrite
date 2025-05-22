// Rewrite/client/src/components/Content/VersionSelector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import ArticleForm from './ArticleForm'; // Reused for replies and new variations
import { formatDistanceToNow } from 'date-fns';
import { FaThumbsUp, FaRegThumbsUp, FaFlag, FaReply, FaPlusCircle, FaCheckCircle, FaSpinner, FaTimes } from 'react-icons/fa';

const VersionSelector = ({
  contextSegment, // The segment whose siblings are being shown, and for which we show direct actions
  onSelectVersion,  // When a listed SIBLING is chosen for the main lineage
  onClose,
  onContextSegmentUpdate, // Callback if contextSegment itself is liked/reported/replied to
  onNewVariationAdded,  // Callback if a new SIBLING variation is added via this component
}) => {
  const [siblingVersions, setSiblingVersions] = useState([]);
  const [loadingSiblings, setLoadingSiblings] = useState(true); // Specific loading state for siblings
  const [error, setError] = useState(null);
  const [actionsOpenForSibling, setActionsOpenForSibling] = useState(null);
  const [showNewVariationFormForSibling, setShowNewVariationFormForSibling] = useState(null);
  const [showReplyFormForContext, setShowReplyFormForContext] = useState(false);

  const [contextLikeStatus, setContextLikeStatus] = useState({ count: 0, likedByUser: false });
  const [contextReportStatus, setContextReportStatus] = useState({ isReported: false, reportedByUser: false });
  const [loadingContextLike, setLoadingContextLike] = useState(false);
  const [loadingContextReport, setLoadingContextReport] = useState(false);

  const { apiClient, user, isAuthenticated } = useAuth();

  console.log("VersionSelector: Rendered. ContextSegment prop:", contextSegment);

  useEffect(() => {
    console.log("VersionSelector: contextSegment useEffect triggered. contextSegment:", contextSegment);
    if (contextSegment) {
        setContextLikeStatus({
            count: contextSegment.likeCount || 0,
            likedByUser: isAuthenticated && contextSegment.likes ? contextSegment.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) : false,
        });
        setContextReportStatus({
            isReported: contextSegment.isReported || false,
            reportedByUser: isAuthenticated && contextSegment.reports ? contextSegment.reports.some(report => (report.reporter === user?.id || report.reporter?._id === user?.id)) : false,
        });
    } else {
        // Reset if contextSegment becomes null (e.g., selector is closed and re-opened with no context)
        setContextLikeStatus({ count: 0, likedByUser: false });
        setContextReportStatus({ isReported: false, reportedByUser: false });
    }
  }, [contextSegment, isAuthenticated, user]);


  const fetchSiblingVersions = useCallback(async () => {
    console.log("VS: fetchSiblingVersions called. ContextSegment:", contextSegment);

    if (!contextSegment || !contextSegment.id) {
        console.log("VS: No contextSegment or contextSegment.id. Setting siblings to [] and loadingSiblings to false.");
        setSiblingVersions([]);
        setLoadingSiblings(false); // Ensure loading is stopped
        setError(null); // Clear any previous errors
        return;
    }

    console.log("VS: Setting loadingSiblings to TRUE for contextSegment.id:", contextSegment.id);
    setLoadingSiblings(true);
    setError(null);
    setActionsOpenForSibling(null);
    setShowNewVariationFormForSibling(null);
    // setShowReplyFormForContext(false); // Decided to keep this independent

    try {
      console.log("VS: Calling API to get versions for:", contextSegment.id);
      const { data } = await apiClient.get(`/content/${contextSegment.id}/versions`);
      console.log("VS: API response for versions received:", data);

      const initializedVersions = (data || []).map(v => ({
          ...v,
          likedByUser: isAuthenticated && v.likes ? v.likes.some(likeId => (typeof likeId === 'string' ? likeId : likeId.id) === user?.id) : false,
          currentLikeCount: v.likeCount || 0,
          reportedInUI: v.isReported || false,
      }));
      setSiblingVersions(initializedVersions);
      console.log("VS: Sibling versions state updated:", initializedVersions);
    } catch (err) {
      console.error("VS: Failed to fetch sibling versions:", err);
      setError(err.response?.data?.error || "Could not load alternative versions.");
      setSiblingVersions([]); // Clear on error
    } finally {
      console.log("VS: Setting loadingSiblings to FALSE in finally block.");
      setLoadingSiblings(false);
    }
  }, [contextSegment, apiClient, isAuthenticated, user]);

  useEffect(() => {
    console.log("VersionSelector: fetchSiblingVersions useEffect triggered.");
    fetchSiblingVersions();
  }, [fetchSiblingVersions]); // This will re-run if contextSegment (part of fetchSiblingVersions deps) changes

  // --- Actions for the ContextSegment ---
  const handleLikeContextSegment = async (e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    if (e) e.stopPropagation();
    if (!isAuthenticated || !contextSegment) return alert("Please log in.");
    setLoadingContextLike(true);
    try {
        const { data } = await apiClient.post(`/content/${contextSegment.id}/like`);
        setContextLikeStatus({ count: data.likeCount, likedByUser: data.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) });
        if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, likeCount: data.likeCount, likes: data.likes });
    } catch (err) { console.error("Failed to like context segment:", err); alert(err.response?.data?.error || "Like failed for context segment.");
    } finally { setLoadingContextLike(false); }
  };
  const handleReportContextSegment = async (e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    if (e) e.stopPropagation();
    if (!isAuthenticated || !contextSegment) return alert("Please log in.");
    if (contextReportStatus.isReported && contextReportStatus.reportedByUser) return alert("You already reported this segment.");
    setLoadingContextReport(true);
    try {
        const { data } = await apiClient.post(`/content/${contextSegment.id}/report`, { reason: "Reported from VersionSelector (context)" });
        setContextReportStatus({ isReported: data.isReported, reportedByUser: true });
        alert("Context segment reported.");
        if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, isReported: data.isReported, reports: [...(contextSegment.reports || []), {reporter: user?.id}] });
    } catch (err) { console.error("Failed to report context segment:", err); alert(err.response?.data?.error || "Report failed for context segment.");
    } finally { setLoadingContextReport(false); }
  };
  const handleReplyToContextSuccess = (newReply) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    setShowReplyFormForContext(false);
    if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, action: 'reply_to_context_in_versions', newReplyId: newReply.id });
  };

  // --- Actions for SIBLING Versions ---
  const handleSiblingVersionItemClick = (siblingId) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    setActionsOpenForSibling(prev => (prev === siblingId ? null : siblingId));
    setShowNewVariationFormForSibling(null);
  };
  const handleToggleLikeSibling = async (siblingId, e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    e.stopPropagation();
    if (!isAuthenticated) return alert("Please log in to like a version.");
    try {
        const { data } = await apiClient.post(`/content/${siblingId}/like`);
        setSiblingVersions(prev => prev.map(s => s.id === siblingId ? {...s, likedByUser: data.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id), currentLikeCount: data.likeCount} : s));
    } catch (err) { console.error("Failed to like sibling version:", err); alert(err.response?.data?.error || "Like failed for sibling version."); }
  };
  const handleReportSibling = async (siblingId, e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    e.stopPropagation();
    if (!isAuthenticated) return alert("Please log in to report a version.");
    const sibling = siblingVersions.find(s => s.id === siblingId);
    if (sibling?.reportedInUI) { alert("This version has already been reported by you in this session or is globally flagged."); return; }
    try {
        await apiClient.post(`/content/${siblingId}/report`, { reason: "Reported from VersionSelector (sibling)" });
        alert("Sibling version reported.");
        setSiblingVersions(prev => prev.map(s => s.id === siblingId ? {...s, reportedInUI: true, isReported: true} : s));
    } catch (err) { console.error("Failed to report sibling version:", err); alert(err.response?.data?.error || "Report failed for sibling version."); }
  };
  const handleToggleNewVariationFormForSibling = (contextForForm, e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    if(e) e.stopPropagation();
    setShowNewVariationFormForSibling(prev => (prev === contextForForm ? null : contextForForm));
  };
  const handleNewSiblingVariationPostSuccess = (newVariation) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    setShowNewVariationFormForSibling(null);
    fetchSiblingVersions();
    if (onNewVariationAdded) onNewVariationAdded(newVariation);
  };
  const handleUseThisSiblingVersion = (siblingIdToUse, e) => { /* ... (same as before, ID: client_src_components_Content_VersionSelector_jsx_for_explore_flow) ... */
    e.stopPropagation();
    if (onSelectVersion) onSelectVersion(siblingIdToUse);
  };

  // Initial check to prevent rendering if contextSegment isn't ready
  if (!contextSegment) {
    console.log("VersionSelector: contextSegment is null or undefined, not rendering.");
    // It's better if the parent component (InteractiveLineageView/ReadPageArticleView)
    // conditionally renders VersionSelector only when contextSegment is valid.
    // However, this check provides a fallback.
    return null; // Or a minimal loading state if preferred, but null is cleaner if parent controls visibility
  }

  return (
    <div className="version-selector card" style={{marginTop: '1rem', background: '#f0f2f5', border:'1px solid #007bff', padding: '15px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{margin:0, fontSize: '1.25rem', color: '#333'}}>Segment & Its Versions</h4>
        {onClose && <button onClick={onClose} className="btn btn-link" style={{padding: '0 5px', fontSize: '1.4rem', lineHeight: 1, color: '#6c757d'}} title="Close Version Panel">&times;</button>}
      </div>

      {/* Actions for the CONTEXT SEGMENT */}
      <div className="context-segment-actions-box card" style={{padding: '15px', background:'#e9ecef', border: '1px solid #ced4da', borderRadius:'4px', marginBottom:'20px'}}>
        <p style={{fontWeight: 600, marginBottom:'8px', fontSize:'1rem', color:'#212529'}}>
          Actions for Original Segment:
          <em style={{display:'block', fontWeight:400, fontSize:'0.85rem', color:'#495057', marginTop:'3px'}}>"{contextSegment.text.substring(0,100)}{contextSegment.text.length > 100 ? '...' : ''}"</em>
        </p>
        <div className="actions-for-context" style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center'}}>
            <button onClick={handleLikeContextSegment} className="btn btn-sm btn-outline-primary" disabled={!isAuthenticated || loadingContextLike}>
                {loadingContextLike ? <FaSpinner className="icon spin"/> : (contextLikeStatus.likedByUser ? <FaThumbsUp/> : <FaRegThumbsUp />)} Like ({contextLikeStatus.count})
            </button>
            <button onClick={handleReportContextSegment} className="btn btn-sm btn-outline-danger" disabled={!isAuthenticated || loadingContextReport || (contextReportStatus.isReported && contextReportStatus.reportedByUser)}>
                {loadingContextReport ? <FaSpinner className="icon spin"/> : <FaFlag />} {(contextReportStatus.isReported && contextReportStatus.reportedByUser) ? 'You Reported' : (contextReportStatus.isReported ? 'Flagged' : 'Report')}
            </button>
            {isAuthenticated && (
                <button onClick={() => setShowReplyFormForContext(prev => !prev)} className="btn btn-sm btn-outline-secondary">
                    <FaReply /> {showReplyFormForContext ? 'Cancel Reply' : 'Reply to This Segment'}
                </button>
            )}
        </div>
        {showReplyFormForContext && (
            <div style={{marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e0e0e0'}}>
                <h6 style={{marginTop:0, marginBottom:'10px', fontSize:'0.9rem'}}>Your Reply (will be a child of the segment above)</h6>
                <ArticleForm
                    parentContentId={contextSegment.id}
                    onPostSuccess={handleReplyToContextSuccess}
                    onCancel={() => setShowReplyFormForContext(false)}
                />
            </div>
        )}
      </div>

      {/* Display of SIBLING Versions */}
      <h5 style={{marginTop: '15px', marginBottom:'10px', borderTop:'1px solid #ced4da', paddingTop:'15px', fontSize:'1.1rem', color:'#333'}}>Alternative Sibling Versions:</h5>
      {loadingSiblings && <LoadingSpinner />} {/* Specific loader for siblings */}
      {error && <p className="error-message text-center">{error}</p>}

      {!loadingSiblings && !error && siblingVersions.length > 0 && (
        <ul style={{listStyle:'none', padding:0}}>
          {siblingVersions.map(sibling => (
            <li
              key={sibling.id}
              onClick={() => handleSiblingVersionItemClick(sibling.id)}
              style={{ border: actionsOpenForSibling === sibling.id ? '2px solid #28a745' : '1px solid #e0e0e0', padding: '10px', marginBottom: '10px', borderRadius: '4px', cursor: 'pointer', background: actionsOpenForSibling === sibling.id ? '#f3fcf3' : '#fff', transition: 'all 0.2s ease-in-out'}}
            >
              <p style={{ margin: '0 0 5px 0', fontWeight: 500, fontSize:'0.9rem' }}>{sibling.text.substring(0, 150)}{sibling.text.length > 150 ? '...' : ''}</p>
              <small className="version-meta" style={{color: '#6c757d', fontSize:'0.8rem'}}>
                By {sibling.author?.username || 'Unknown'} • {formatDistanceToNow(new Date(sibling.createdAt), { addSuffix: true })} • <FaThumbsUp size="0.75em"/> {sibling.currentLikeCount}
                {(sibling.isReported || sibling.reportedInUI) && <span style={{color: 'red', marginLeft: '8px'}}><FaFlag size="0.75em"/> Reported</span>}
              </small>

              {actionsOpenForSibling === sibling.id && (
                <div className="actions-panel" style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ced4da'}}>
                  <button onClick={(e) => handleToggleLikeSibling(sibling.id, e)} className="btn btn-sm btn-link" disabled={!isAuthenticated}>
                    {sibling.likedByUser ? <FaThumbsUp color="blue"/> : <FaRegThumbsUp />} Like ({sibling.currentLikeCount})
                  </button>
                  <button onClick={(e) => handleReportSibling(sibling.id, e)} className="btn btn-sm btn-link" disabled={!isAuthenticated || sibling.isReported || sibling.reportedInUI}>
                    <FaFlag /> {(sibling.isReported || sibling.reportedInUI) ? 'Reported' : 'Report'}
                  </button>
           {/*
                  <button onClick={(e) => handleToggleNewVariationFormForSibling(sibling.id, e)} className="btn btn-sm btn-link">
                    <FaPlusCircle /> {showNewVariationFormForSibling === sibling.id ? 'Cancel Variation' : 'Add Variation Below It'}
                  </button>
*/}
                  <button onClick={(e) => handleUseThisSiblingVersion(sibling.id, e)} className="btn btn-sm btn-success" style={{marginLeft: '10px'}}>
                    <FaCheckCircle /> Use this Sibling
                  </button>
                  {showNewVariationFormForSibling === sibling.id && (
                    <div style={{marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef'}}>
                      <h6 style={{marginTop:0, marginBottom:'10px', fontSize:'0.9rem'}}>Add New Variation (as a sibling to these)</h6>
                      <ArticleForm
                        parentContentId={contextSegment.parentContent}
                        onPostSuccess={handleNewSiblingVariationPostSuccess}
                        onCancel={() => setShowNewVariationFormForSibling(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!loadingSiblings && !error && siblingVersions.length === 0 && ( <p className="text-center my-1" style={{fontSize:'0.9rem', color:'#6c757d'}}>No other sibling versions found.</p> )}

      {!loadingSiblings && contextSegment && contextSegment.parentContent && (
         <div style={{marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #dee2e6'}}>
            <button onClick={() => handleToggleNewVariationFormForSibling('GLOBAL_SIBLING', null)} className="btn btn-sm btn-outline-secondary">
                <FaPlusCircle /> {showNewVariationFormForSibling === 'GLOBAL_SIBLING' ? 'Cancel New Sibling Variation' : 'Add a New Sibling Variation'}
            </button>
            {showNewVariationFormForSibling === 'GLOBAL_SIBLING' && (
                <div style={{marginTop: '10px', padding: '15px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef'}}>
                    <h6 style={{marginTop:0, marginBottom:'10px', fontSize:'0.9rem'}}>Add New Sibling Variation</h6>
                    <ArticleForm
                        parentContentId={contextSegment.parentContent}
                        onPostSuccess={handleNewSiblingVariationPostSuccess}
                        onCancel={() => setShowNewVariationFormForSibling(null)}
                    />
                </div>
            )}
         </div>
      )}
    </div>
  );
};

export default VersionSelector;

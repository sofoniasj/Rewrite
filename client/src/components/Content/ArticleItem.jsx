// Rewrite/client/src/components/Content/ArticleItem.jsx
import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
// ADDED FaCheckCircle to the import
import { FaThumbsUp, FaRegThumbsUp, FaEdit, FaTrashAlt, FaFlag, FaReply, FaSpinner, FaMedal, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import NestedContent from './NestedContent';
import ArticleForm from './ArticleForm';
//import LoadingSpinner from '../Common/LoadingSpinner';

const ArticleItem = ({ article, onContentUpdate, onContentDelete, showPopularityScore = false }) => {
  const { user, apiClient, isAuthenticated } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(article.text);
  const [likeStatus, setLikeStatus] = useState({ count: article.likeCount || 0, likedByUser: false });
  const [reportStatus, setReportStatus] = useState({ 
    reportedByUser: false, 
    isReportedGlobally: article.isReported || false 
  });
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(null);
  const [refreshChildrenKey, setRefreshChildrenKey] = useState(0);

  const isAuthor = user && article.author && user.id === article.author.id;
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && article.likes) {
       const liked = article.likes.some(like => (typeof like === 'string' ? like : like.id) === user.id);
       setLikeStatus({ count: article.likeCount || 0, likedByUser: liked });
    } else {
       setLikeStatus({ count: article.likeCount || 0, likedByUser: false });
    }
    setReportStatus({
        reportedByUser: isAuthenticated && article.reports ? article.reports.some(report => (report.reporter === user.id || report.reporter?._id === user.id)) : false,
        isReportedGlobally: article.isReported || false
    });
    setEditedText(article.text || ''); // Ensure text is not undefined
  }, [article, user, isAuthenticated]);

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
        alert('Please log in to like content.');
        return;
    }
    setLoadingLike(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/content/${article.id}/like`);
      const newLikedByUser = data.likes.some(like => (typeof like === 'string' ? like : like.id) === user.id);
      setLikeStatus({ count: data.likeCount, likedByUser: newLikedByUser });
      if(onContentUpdate) onContentUpdate({...article, likeCount: data.likeCount, likes: data.likes });
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setError(err.response?.data?.error || "Like failed.");
    } finally {
      setLoadingLike(false);
    }
  };

  const handleReport = async () => {
     if (!isAuthenticated) {
        alert('Please log in to report content.');
        return;
     }
     if (reportStatus.reportedByUser || reportStatus.isReportedGlobally) {
        alert("This content has already been reported by you or flagged by others.");
        return;
     }
     setLoadingReport(true);
     setError(null);
     try {
       const { data } = await apiClient.post(`/content/${article.id}/report`, { reason: 'Reported via button' });
       setReportStatus({ reportedByUser: true, isReportedGlobally: data.isReported });
       alert('Content reported successfully.');
       if(onContentUpdate) onContentUpdate({...article, isReported: data.isReported, reports: [...(article.reports || []), {reporter: user.id}] });
     } catch (err) {
       console.error("Failed to report:", err);
       setError(err.response?.data?.error || "Report failed.");
       alert(err.response?.data?.error || "Report failed.");
     } finally {
       setLoadingReport(false);
     }
   };

  const handleEdit = () => setIsEditing(true);
  const handleCancelEdit = () => { setIsEditing(false); setEditedText(article.text || ''); setError(null); };

  const handleSaveEdit = async (e) => {
     e.preventDefault();
     if (!editedText.trim()) {
        setError("Content cannot be empty.");
        return;
     }
     setLoadingEdit(true);
     setError(null);
     try {
       const { data } = await apiClient.put(`/content/${article.id}`, { text: editedText.trim() });
       setIsEditing(false);
       if (onContentUpdate) {
         onContentUpdate(data); // Pass the full updated article object
       }
     } catch (err) {
       console.error("Failed to save edit:", err);
       setError(err.response?.data?.error || "Failed to save edit.");
     } finally {
       setLoadingEdit(false);
     }
   };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this ${article.parentContent ? 'reply' : 'article'}? This action cannot be undone.`)) return;
    setLoadingDelete(true); setError(null);
    try {
        let deleteUrl = '';
        if (isAdmin) {
            deleteUrl = `/content/admin/${article.id}`;
        } else if (isAuthor) {
            // Assuming a general delete endpoint for authors, or it could be the same as admin if permissions are handled server-side
            // For now, let's assume authors can't delete directly from here unless it's an admin action or a specific author delete endpoint is made
            // This part needs clarification based on your API design for author deletions.
            // If authors can delete their own content via a non-admin route:
            // deleteUrl = `/content/${article.id}`; // This would need a DELETE handler on this route in backend
            alert("Author delete functionality needs a specific endpoint or admin rights for this button.");
            setLoadingDelete(false);
            return;
        } else {
            alert("You are not authorized to delete this content.");
            setLoadingDelete(false);
            return;
        }
        
        await apiClient.delete(deleteUrl);
        if (onContentDelete) onContentDelete(article.id);
    } catch (err) {
        console.error("Failed to delete content:", err);
        setError(err.response?.data?.error || "Failed to delete content.");
        setLoadingDelete(false);
    }
  };

  const handleReplySuccess = (newReply) => { setIsReplying(false); setRefreshChildrenKey(prev => prev + 1); };

  return (
    <div className="card article-item" id={`article-${article.id}`} style={{marginBottom:'1.5rem'}}>
      {loadingDelete && <LoadingSpinner overlay={true} />}
      {article.title && <h3 className="card-title">{article.title}</h3>}
      <div className="card-meta" style={{marginBottom:'0.75rem'}}>
        <span>By: {article.author?.username || 'Unknown User'} 
            {article.author?.isVerified && <FaCheckCircle title="Verified Account" style={{color: 'dodgerblue', marginLeft:'4px', fontSize:'0.9em', verticalAlign:'middle'}}/>}
        </span>
        <span style={{marginLeft:'10px'}}>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
        {article.updatedAt && new Date(article.updatedAt).getTime() !== new Date(article.createdAt).getTime() && (
            <em style={{fontSize:'0.8em', color:'#6c757d', marginLeft:'10px'}}>(edited {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })})</em>
        )}
        {reportStatus.isReportedGlobally && <span className="report-indicator" style={{color:'red', fontWeight:'bold', marginLeft:'10px'}}><FaFlag title="Reported"/> Reported</span>}
        {showPopularityScore && typeof article.truePopularityScore === 'number' && (
            <span style={{marginLeft:'10px', color: '#dc3545', fontWeight:'bold'}}>
                <FaMedal style={{marginRight:'4px'}} /> Popularity: {article.truePopularityScore}
            </span>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveEdit} style={{marginBottom:'1rem'}}>
            {loadingEdit && <LoadingSpinner />}
            {error && !loadingEdit && <p className="error-message">{error}</p>}
            <div className="form-group">
                <textarea className="form-control" rows="4" value={editedText} onChange={(e) => setEditedText(e.target.value)} required maxLength="10000" disabled={loadingEdit}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit} disabled={loadingEdit}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm" disabled={loadingEdit || !editedText.trim()}>
                    {loadingEdit ? <><FaSpinner className="spin" style={{marginRight:'5px'}}/>Saving...</> : 'Save Changes'}
                </button>
            </div>
        </form>
      ) : (
        <p className="card-text" style={{whiteSpace:'pre-wrap'}}>{article.text || "[No content]"}</p>
      )}
      {error && !isEditing && !loadingEdit && <p className="error-message">{error}</p>}

      <div className="article-actions" style={{marginTop:'1rem', paddingTop:'0.5rem', borderTop:'1px solid #f0f0f0'}}>
        <button onClick={handleToggleLike} className="btn btn-link" disabled={loadingLike || !isAuthenticated}> {loadingLike ? <FaSpinner className="icon spin" /> : (likeStatus.likedByUser ? <FaThumbsUp className="icon" color="blue"/> : <FaRegThumbsUp className="icon"/>)} Like <span className="like-count">({likeStatus.count})</span> </button>
        {isAuthenticated && (<button onClick={() => setIsReplying(prev => !prev)} className="btn btn-link"> <FaReply className="icon" /> {isReplying ? 'Cancel Reply' : 'Reply'} </button> )}
        {isAuthenticated && (<button onClick={handleReport} className="btn btn-link" disabled={loadingReport || reportStatus.reportedByUser || reportStatus.isReportedGlobally}> {loadingReport ? <FaSpinner className="icon spin" /> : <FaFlag className="icon" />} {reportStatus.reportedByUser ? 'You Reported' : (reportStatus.isReportedGlobally ? 'Flagged' : 'Report')} </button> )}
        {isAuthor && !isEditing && (<button onClick={handleEdit} className="btn btn-link"> <FaEdit className="icon" /> Edit </button> )}
        {isAdmin && (<button onClick={handleDelete} className="btn btn-link text-danger" disabled={loadingDelete}> <FaTrashAlt className="icon" /> Delete (Admin) </button> )}
      </div>

      {isReplying && (<div style={{marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #eee'}}> <ArticleForm parentContentId={article.id} onPostSuccess={handleReplySuccess} onCancel={() => setIsReplying(false)}/> </div>)}
      
      {/* Only render NestedContent if the article object is valid and has an ID */}
      {article && article.id && <NestedContent parentId={article.id} key={refreshChildrenKey} />}
    </div>
  );
};

export default ArticleItem;

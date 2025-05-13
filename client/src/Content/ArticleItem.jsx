// Rewrite/client/src/components/Content/ArticleItem.jsx
import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FaThumbsUp, FaRegThumbsUp, FaEdit, FaTrashAlt, FaFlag, FaReply, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import NestedContent from './NestedContent'; // To display replies
import ArticleForm from './ArticleForm'; // For replying inline
import LoadingSpinner from '../Common/LoadingSpinner';

const ArticleItem = ({ article, onContentUpdate, onContentDelete }) => {
  const { user, apiClient, isAuthenticated } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(article.text);
  const [likeStatus, setLikeStatus] = useState({ count: article.likeCount, likedByUser: false });
  const [reportStatus, setReportStatus] = useState({ reportedByUser: false, isReportedGlobally: article.isReported });
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(null);
  const [refreshChildrenKey, setRefreshChildrenKey] = useState(0); // To refresh nested content

  const isAuthor = user && user.id === article.author?.id; // Check if current user is the author
  const isAdmin = user && user.role === 'admin';

  // Determine initial like status
  useEffect(() => {
    if (isAuthenticated && article.likes) {
       const liked = article.likes.some(like => (typeof like === 'string' ? like : like.id) === user.id);
       setLikeStatus({ count: article.likeCount, likedByUser: liked });
    } else {
       setLikeStatus({ count: article.likeCount, likedByUser: false });
    }
    // Determine initial report status (more complex if needing to check if *this* user reported)
    // For simplicity, just use the global flag for now. A check against article.reports could be added.
    setReportStatus({ reportedByUser: false, isReportedGlobally: article.isReported });
    setEditedText(article.text); // Ensure edited text resets if article prop changes
  }, [article, user, isAuthenticated]);

  const handleToggleLike = async () => {
    if (!isAuthenticated) return alert('Please log in to like content.'); // Or show modal
    setLoadingLike(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/content/${article.id}/like`);
      setLikeStatus({ count: data.likeCount, likedByUser: !likeStatus.likedByUser }); // Toggle based on action
      // Optionally update the parent list via onContentUpdate if needed elsewhere
      if(onContentUpdate) onContentUpdate({...article, likeCount: data.likeCount, likes: data.likes });
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setError(err.response?.data?.error || "Like failed.");
    } finally {
      setLoadingLike(false);
    }
  };

  const handleReport = async () => {
     if (!isAuthenticated) return alert('Please log in to report content.');
     if (reportStatus.isReportedGlobally) return; // Maybe allow multiple reports? Depends on requirements. For now, prevent if already flagged.
     // Could add a check here if this specific user already reported

     setLoadingReport(true);
     setError(null);
     try {
       // Could add a modal here to ask for a reason
       const { data } = await apiClient.post(`/content/${article.id}/report`, { reason: 'Reported via button' });
       setReportStatus({ reportedByUser: true, isReportedGlobally: data.isReported });
       alert('Content reported successfully.'); // Simple feedback
       if(onContentUpdate) onContentUpdate({...article, isReported: data.isReported, reports: [...(article.reports || []), {reporter: user.id}] }); // Update parent
     } catch (err) {
       console.error("Failed to report:", err);
       setError(err.response?.data?.error || "Report failed.");
       alert(err.response?.data?.error || "Report failed."); // Show error
     } finally {
       setLoadingReport(false);
     }
   };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(article.text); // Reset text
    setError(null);
  };

  const handleSaveEdit = async (e) => {
     e.preventDefault();
     if (!editedText.trim()) return setError("Content cannot be empty.");

     setLoadingEdit(true);
     setError(null);
     try {
       const { data } = await apiClient.put(`/content/${article.id}`, { text: editedText.trim() });
       setIsEditing(false);
       // Update the parent component's state
       if (onContentUpdate) {
         onContentUpdate(data);
       }
     } catch (err) {
       console.error("Failed to save edit:", err);
       setError(err.response?.data?.error || "Failed to save edit.");
     } finally {
       setLoadingEdit(false);
     }
   };

  const handleDelete = async () => {
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete this ${article.parentContent ? 'reply' : 'article'}? This action cannot be undone.`)) {
        return;
    }
    setLoadingDelete(true);
    setError(null);
    try {
        // Admin delete uses a different endpoint
        const deleteUrl = isAdmin ? `/content/admin/${article.id}` : `/content/${article.id}`; // Assuming non-admin author delete is not allowed yet based on API
        if (!isAdmin && isAuthor) {
            // TODO: Implement author delete endpoint if required
             alert("Author delete functionality not yet implemented.");
             setLoadingDelete(false);
             return;
        } else if (!isAdmin) {
            alert("You are not authorized to delete this content.");
            setLoadingDelete(false);
            return;
        }

        await apiClient.delete(deleteUrl);
        // Notify parent component to remove this item from the list
        if (onContentDelete) {
            onContentDelete(article.id);
        }
        // No need to setLoadingDelete(false) as the component will unmount
    } catch (err) {
        console.error("Failed to delete content:", err);
        setError(err.response?.data?.error || "Failed to delete content.");
        setLoadingDelete(false);
    }
  };


  const handleReplySuccess = (newReply) => {
     // When a reply is successfully posted, close the form and refresh children
     setIsReplying(false);
     setRefreshChildrenKey(prev => prev + 1); // Increment key to trigger NestedContent refresh
   };

  return (
    <div className="card article-item">
      {loadingDelete && <LoadingSpinner overlay={true} />}
      {article.title && <h3 className="card-title">{article.title}</h3>}
      <div className="card-meta">
        <span>By: {article.author?.username || 'Unknown User'}</span>
        <span>
          {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
        </span>
        {reportStatus.isReportedGlobally && <span className="report-indicator"><FaFlag color="red" title="This content has been reported"/> Reported</span>}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveEdit}>
            {loadingEdit && <LoadingSpinner />}
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <textarea
                    className="form-control"
                    rows="4"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    required
                    maxLength="10000"
                    disabled={loadingEdit}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit} disabled={loadingEdit}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm" disabled={loadingEdit || !editedText.trim()}>
                    {loadingEdit ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      ) : (
        <p className="card-text">{article.text}</p>
      )}

      {error && !isEditing && <p className="error-message">{error}</p>} {/* Show general errors if not editing */}

      <div className="article-actions">
        <button onClick={handleToggleLike} className="btn btn-link" disabled={loadingLike || !isAuthenticated}>
          {loadingLike ? <FaSpinner className="icon spin" /> : (likeStatus.likedByUser ? <FaThumbsUp className="icon" color="blue"/> : <FaRegThumbsUp className="icon"/>)}
          Like <span className="like-count">({likeStatus.count})</span>
        </button>
        {isAuthenticated && (
          <button onClick={() => setIsReplying(!isReplying)} className="btn btn-link">
            <FaReply className="icon" /> {isReplying ? 'Cancel Reply' : 'Reply'}
          </button>
        )}
        {isAuthenticated && (
            <button onClick={handleReport} className="btn btn-link" disabled={loadingReport || reportStatus.isReportedGlobally}>
                {loadingReport ? <FaSpinner className="icon spin" /> : <FaFlag className="icon" />}
                {reportStatus.isReportedGlobally ? 'Reported' : 'Report'}
            </button>
        )}
        {isAuthor && !isEditing && (
          <button onClick={handleEdit} className="btn btn-link">
            <FaEdit className="icon" /> Edit
          </button>
        )}
         {/* Admin delete button */}
         {isAdmin && (
             <button onClick={handleDelete} className="btn btn-link text-danger" disabled={loadingDelete}>
                 <FaTrashAlt className="icon" /> Delete (Admin)
             </button>
         )}
         {/* TODO: Add Author delete button if required */}
         {/* {isAuthor && !isAdmin && ( ... )} */}
      </div>

      {isReplying && (
        <div style={{marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #eee'}}>
          <ArticleForm
            parentContentId={article.id}
            onPostSuccess={handleReplySuccess}
            onCancel={() => setIsReplying(false)} // Add cancel handler
          />
        </div>
      )}

      {/* Display nested replies */}
      <NestedContent parentId={article.id} key={refreshChildrenKey} />

    </div>
  );
};

export default ArticleItem;


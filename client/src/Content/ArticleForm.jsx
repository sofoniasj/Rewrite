// Rewrite/client/src/components/Content/ArticleForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import { FaSave, FaWindowClose, FaPaperPlane } from 'react-icons/fa'; // Added FaPaperPlane

const ArticleForm = ({
  parentContentId = null,
  onPostSuccess,       // For new posts/replies
  onCancel,
  isEditMode = false,    // New prop for edit mode
  contentToEdit = null,  // New prop with content data for editing
  onEditSuccess        // New callback for successful edit
}) => {
  const isReply = !!parentContentId && !isEditMode;
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  useEffect(() => {
    if (isEditMode && contentToEdit) {
      console.log("ArticleForm in Edit Mode, contentToEdit.text:", contentToEdit.text); // DEBUG LOG
      setText(contentToEdit.text || '');
      // Title is not typically edited for existing segments/replies in this context
      setTitle(contentToEdit.title || ''); // Pre-fill title if editing a top-level article
    } else {
      setText(''); 
      setTitle(''); // Clear title for new post/reply
    }
  }, [isEditMode, contentToEdit]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(isEditMode ? "Content cannot be empty." : (isReply ? "Reply cannot be empty." : "Content cannot be empty."));
      return;
    }
    // Title is only required for NEW, NON-REPLY articles. Not for edits or replies.
    if (!isReply && !isEditMode && !title.trim()) {
        setError("Title cannot be empty for a new article.");
        return;
    }

    setLoading(true);
    setError(null);

    if (isEditMode && contentToEdit) {
      // --- EDIT LOGIC ---
      try {
        // For edits, we only send the text. Title editing might be a separate feature for root articles.
        const payload = { text: text.trim() };
        // If you want to allow title editing for root articles during edit mode:
        // if (!contentToEdit.parentContent && title.trim()) payload.title = title.trim();

        const { data } = await apiClient.put(`/content/${contentToEdit.id}`, payload);
        if (onEditSuccess) {
          onEditSuccess(data); // Pass updated content back
        }
      } catch (err) {
        console.error("Failed to update content:", err);
        setError(err.response?.data?.error || "Failed to save changes. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // --- CREATE LOGIC (New Article or Reply) ---
      const payload = {
        text: text.trim(),
        ...(isReply ? { parentContent: parentContentId } : (title.trim() ? { title: title.trim() } : {})),
      };
      try {
        const { data } = await apiClient.post('/content', payload);
        setText('');
        if (!isReply) setTitle('');
        if (onPostSuccess) {
          onPostSuccess(data);
        }
      } catch (err) {
        console.error("Failed to post content:", err);
        setError(err.response?.data?.error || "Failed to post. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="article-form">
      {loading && <LoadingSpinner />}
      {error && <p className="error-message" style={{marginBottom:'10px'}}>{error}</p>}

      {/* Title input: only for new, non-reply, non-edit posts */}
      {/* If editing a ROOT article and want to allow title edit, this condition needs adjustment */}
      {!isReply && !isEditMode && ( // This correctly hides title for replies and edits
        <div className="form-group">
          <label htmlFor="article-title">Title</label>
          <input
            type="text"
            id="article-title"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title"
            maxLength="150"
            required={!isReply && !isEditMode} // Required only for new top-level articles
            disabled={loading}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor={`content-text-${parentContentId || contentToEdit?.id || 'new'}`}>
            {isEditMode ? 'Edit Content' : (isReply ? 'Your Reply' : 'Content')}
        </label>
        <textarea
          id={`content-text-${parentContentId || contentToEdit?.id || 'new'}`}
          className="form-control"
          rows={isEditMode ? 6 : 4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isEditMode ? 'Edit your content...' : (isReply ? 'Write your reply...' : 'Write your article content...')}
          required
          maxLength="100000"
          disabled={loading}
        ></textarea>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop:'5px' }}>
         {onCancel && (
             <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
                <FaWindowClose style={{marginRight:'4px'}}/>Cancel
             </button>
         )}
         <button type="submit" className={`btn btn-sm ${isEditMode ? 'btn-success' : 'btn-primary'}`} disabled={loading || !text.trim() || (!isReply && !isEditMode && !title.trim())}>
            {loading ? <FaSpinner className="spin" style={{marginRight:'5px'}}/> : 
                (isEditMode ? <><FaSave style={{marginRight:'4px'}}/>Save Changes</> : 
                (isReply ? <><FaPaperPlane style={{marginRight:'4px'}}/>Post Reply</> : <><FaPaperPlane style={{marginRight:'4px'}}/>Post Article</>))
            }
         </button>
      </div>
    </form>
  );
};

export default ArticleForm;

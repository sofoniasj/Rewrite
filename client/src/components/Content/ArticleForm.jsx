// Rewrite/client/src/components/Content/ArticleForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
// ADDED FaSpinner to the import
import { FaSave, FaWindowClose, FaPaperPlane, FaSpinner } from 'react-icons/fa';

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
      // console.log("ArticleForm in Edit Mode, contentToEdit.text:", contentToEdit.text); 
      setText(contentToEdit.text || '');
      // Title is not typically edited for existing segments/replies in this context
      // Only pre-fill title if it's a root article being edited (no parentContent)
      if (!contentToEdit.parentContent) {
        setTitle(contentToEdit.title || '');
      } else {
        setTitle(''); // Replies or child segments don't have their own titles in this form
      }
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
        const payload = { text: text.trim() };
        // If editing a root article and title was part of the form for it
        if (!contentToEdit.parentContent && title.trim() && title.trim() !== contentToEdit.title) {
            // This part is tricky: if you allow title editing for root articles,
            // the form needs to show the title input when isEditMode=true AND !contentToEdit.parentContent
            // For now, assuming title is NOT editable for existing content via this form.
            // If it were, payload would include: payload.title = title.trim();
        }

        const { data } = await apiClient.put(`/content/${contentToEdit.id}`, payload);
        if (onEditSuccess) {
          onEditSuccess(data);
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
        if (!isReply) setTitle(''); // Clear title only if it was a new top-level article form
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

  // Determine if title field should be shown:
  // - NOT for replies
  // - NOT for editing existing child segments (they don't have titles)
  // - YES for creating a NEW top-level article
  // - Potentially YES for editing a top-level article's title (but current logic hides it in edit mode)
  const showTitleField = !isReply && !isEditMode;
  // If you want to allow editing title of a ROOT article:
  // const showTitleField = (!isReply && !isEditMode) || (isEditMode && contentToEdit && !contentToEdit.parentContent);


  return (
    <form onSubmit={handleSubmit} className="article-form">
      {/* Form-level loading spinner, could be removed if button spinners are enough */}
      {/* {loading && <LoadingSpinner />}  */}
      {error && <p className="error-message" style={{marginBottom:'10px'}}>{error}</p>}

      {showTitleField && (
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
            required={showTitleField} // Required only when shown
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
          maxLength="10000"
          disabled={loading}
        ></textarea>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop:'5px' }}>
         {onCancel && (
             <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
                <FaWindowClose style={{marginRight:'4px'}}/>Cancel
             </button>
         )}
         <button 
            type="submit" 
            className={`btn btn-sm ${isEditMode ? 'btn-success' : 'btn-primary'}`} 
            disabled={loading || !text.trim() || (showTitleField && !title.trim())}
        >
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

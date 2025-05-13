// Rewrite/client/src/components/Content/ArticleForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';

const ArticleForm = ({ parentContentId = null, onPostSuccess, onCancel }) => {
  // If parentContentId is provided, this is a reply, otherwise a new article
  const isReply = !!parentContentId;
  const [title, setTitle] = useState(''); // Only used if not a reply
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    if (!isReply && !title.trim()) {
        setError("Title cannot be empty for a new article.");
        return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      text: text.trim(),
      ...(isReply ? { parentContent: parentContentId } : { title: title.trim() }),
    };

    try {
      const { data } = await apiClient.post('/content', payload);
      setText(''); // Clear form
      if (!isReply) setTitle('');
      if (onPostSuccess) {
        onPostSuccess(data); // Pass the newly created content back up
      }
    } catch (err) {
      console.error("Failed to post content:", err);
      setError(err.response?.data?.error || "Failed to post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="article-form">
      {loading && <LoadingSpinner />}
      {error && <p className="error-message">{error}</p>}

      {!isReply && ( // Show title input only for new top-level articles
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
            required={!isReply}
            disabled={loading}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor={`content-text-${parentContentId || 'new'}`}>
            {isReply ? 'Your Reply' : 'Content'}
        </label>
        <textarea
          id={`content-text-${parentContentId || 'new'}`}
          className="form-control"
          rows="5"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isReply ? 'Write your reply...' : 'Write your article content...'}
          required
          maxLength="10000"
          disabled={loading}
        ></textarea>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
         {onCancel && ( // Show cancel button if handler is provided (useful for inline replies)
             <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={loading}
             >
                Cancel
             </button>
         )}
         <button type="submit" className="btn btn-success" disabled={loading || !text.trim() || (!isReply && !title.trim())}>
            {loading ? 'Posting...' : (isReply ? 'Post Reply' : 'Post Article')}
         </button>
      </div>
    </form>
  );
};

export default ArticleForm;

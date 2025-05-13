// Rewrite/client/src/pages/Read/ArticleDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ReadPageArticleView from '../../components/Content/ReadPageArticleView'; // We'll create this next

const ArticleDetailPage = () => {
  const { articleId } = useParams(); // Get the article ID from the URL
  const [lineage, setLineage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  const fetchLineage = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/content/${id}/lineage`);
      setLineage(data || []); // API should return an array of content items
      if (!data || data.length === 0) {
          setError("Article not found or lineage could not be constructed.");
      }
    } catch (err) {
      console.error("Failed to fetch article lineage:", err);
      setError(err.response?.data?.error || "Could not load article content.");
      setLineage([]); // Clear lineage on error
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (articleId) {
      fetchLineage(articleId);
    } else {
        setError("No article ID provided.");
        setLoading(false);
    }
  }, [articleId, fetchLineage]);

  const handleLineageUpdate = (newLineage) => {
      setLineage(newLineage);
  }

  return (
    <div>
      <nav aria-label="breadcrumb" style={{marginBottom: '1rem'}}>
          <ol style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '5px', fontSize: '0.9rem', color: '#555' }}>
            <li><Link to="/read">All Articles</Link></li>
            <li>/</li>
            <li aria-current="page">{loading ? 'Loading...' : (lineage[0]?.title || 'Article Detail')}</li>
          </ol>
      </nav>

      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}

      {!loading && !error && lineage.length > 0 && (
        <ReadPageArticleView
            initialLineage={lineage}
            rootArticleId={articleId}
            onLineageUpdate={handleLineageUpdate} // Allow child to update lineage state
        />
      )}
    </div>
  );
};

export default ArticleDetailPage;

// Rewrite/client/src/pages/Read/ArticleDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ReadPageArticleView from '../../components/Content/ReadPageArticleView';

const ArticleDetailPage = () => {
  const { articleId } = useParams(); // Get the article ID from the URL
  const [currentLineageData, setCurrentLineageData] = useState([]); // State to hold the lineage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiClient } = useAuth();

  const fetchLineageCallback = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/content/${id}/lineage`);
      setCurrentLineageData(data || []);
      if (!data || data.length === 0) {
          setError("Article not found or lineage could not be constructed.");
      }
    } catch (err) {
      console.error("Failed to fetch article lineage:", err);
      setError(err.response?.data?.error || "Could not load article content.");
      setCurrentLineageData([]); // Clear lineage on error
    } finally {
      setLoading(false);
    }
  }, [apiClient]); // apiClient is stable, so this callback is stable unless apiClient changes

  useEffect(() => {
    if (articleId) {
      fetchLineageCallback(articleId);
    } else {
        setError("No article ID provided.");
        setLoading(false);
        setCurrentLineageData([]);
    }
  }, [articleId, fetchLineageCallback]); // Depend on articleId and the memoized callback

  // This function will be passed to ReadPageArticleView
  // It allows ReadPageArticleView to update the lineage in this parent component
  const handleLineageChangeFromChild = useCallback((newLineage) => {
      setCurrentLineageData(newLineage);
  }, []); // This callback itself doesn't depend on anything that changes often

  const pageTitle = loading ? 'Loading Article...' : (currentLineageData[0]?.title || 'Article Detail');

  return (
    <div>
      <nav aria-label="breadcrumb" style={{marginBottom: '1rem', paddingBottom:'0.5rem', borderBottom: '1px solid #eee'}}>
          <ol style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '5px', fontSize: '0.9rem', color: '#555' }}>
           { /*<li><Link to="/read">All Articles</Link></li>*/}
            <li style={{color: '#888'}}>/</li>
            <li aria-current="page" style={{fontWeight: currentLineageData.length > 0 ? 600: 400}}>
                {pageTitle}
            </li>
          </ol>
      </nav>

      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center" style={{padding: '20px'}}>{error}</p>}

      {!loading && !error && currentLineageData.length > 0 && (
        <ReadPageArticleView
            // Keying ReadPageArticleView by articleId ensures it fully re-mounts if the root article changes
            // This helps reset its internal state, which can be useful.
            key={articleId}
            initialLineage={currentLineageData}
            rootArticleId={articleId}
            onLineageUpdate={handleLineageChangeFromChild}
        />
      )}
      {!loading && !error && currentLineageData.length === 0 && !error && ( // Check for error again
          <p className="text-center my-2">No content found for this article ID.</p>
      )}
    </div>
  );
};

export default ArticleDetailPage;

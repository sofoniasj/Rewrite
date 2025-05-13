// Rewrite/client/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ArticleForm from '../components/Content/ArticleForm';
import ArticleList from '../components/Content/ArticleList';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const HomePage = () => {
  const { isAuthenticated, apiClient } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0); // State to trigger refresh

  const fetchArticles = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch only top-level articles for the homepage
      const { data } = await apiClient.get(`/content?page=${pageNum}&limit=10`);
      // Filter out any potential non-top-level items just in case API changes
      // setArticles(data.articles.filter(art => !art.parentContent));
      setArticles(data.articles); // Assuming API correctly returns only top-level
      setPage(data.page);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      setError(err.response?.data?.error || "Could not load articles. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchArticles(page);
  }, [fetchArticles, page, refreshKey]); // Refetch when page changes or refreshKey changes

  const handlePostSuccess = (newArticle) => {
    // If the new article is a top-level one, add it to the top of the list
    if (!newArticle.parentContent) {
        setArticles(prev => [newArticle, ...prev]);
        // Optionally, could refetch page 1 to ensure correct order and pagination
        // fetchArticles(1);
    }
    setShowCreateForm(false); // Hide form after successful post
    // Trigger a refresh if needed, e.g., if pagination or sorting is complex
    // setRefreshKey(prev => prev + 1);
  };

  const handleContentUpdate = (updatedArticle) => {
     setArticles(prevArticles =>
        prevArticles.map(article =>
          article.id === updatedArticle.id ? updatedArticle : article
        )
     );
     // Also trigger potential updates in nested children if necessary
     setRefreshKey(prev => prev + 1); // Simple way to trigger potential nested updates
  };

  const handleContentDelete = (deletedArticleId) => {
     setArticles(prevArticles =>
        prevArticles.filter(article => article.id !== deletedArticleId)
     );
     // Also trigger potential updates in nested children if necessary
     setRefreshKey(prev => prev + 1);
  };


  return (
    <div>
      <h1 className="text-center my-1">Welcome to Rewrite</h1>
      <p className="text-center" style={{marginBottom: '2rem'}}>Share your thoughts and build upon ideas.</p>

      {isAuthenticated && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel Post' : 'Create New Article'}
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="card" style={{marginBottom: '2rem'}}>
          <ArticleForm onPostSuccess={handlePostSuccess} />
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}

      {!loading && !error && (
         <ArticleList
            articles={articles}
            onContentUpdate={handleContentUpdate}
            onContentDelete={handleContentDelete}
         />
      )}

      {/* Basic Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '2rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;

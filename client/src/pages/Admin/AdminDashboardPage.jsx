// Rewrite/client/src/pages/Admin/AdminDashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ContentFamilyTree from '../../pages/Admin/ContentFamilyTree'; // We'll create this

const AdminDashboardPage = () => {
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiClient, user } = useAuth(); // Ensure user role is checked by ProtectedRoute

  // Pagination for admin view (optional, but good for large datasets)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ADMIN_PAGE_LIMIT = 100; // How many items to fetch per page for admin

  const fetchAllContentForAdmin = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      // The backend endpoint for admin should be protected and only return data to admins
      const { data } = await apiClient.get(`/content/admin/all?page=${pageNum}&limit=${ADMIN_PAGE_LIMIT}`);
      setAllContent(data.content || []); // Assuming API returns { content: [...] }
      setPage(data.page);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch all content for admin:", err);
      setError(err.response?.data?.error || "Could not load content for admin dashboard.");
      setAllContent([]); // Clear content on error
    } finally {
      setLoading(false);
    }
  }, [apiClient, ADMIN_PAGE_LIMIT]);

  useEffect(() => {
    fetchAllContentForAdmin(page);
  }, [fetchAllContentForAdmin, page]);

  const handleContentDeleted = (deletedContentId) => {
    // Refetch content after deletion to ensure tree is accurate
    // Or, more efficiently, remove the node and its children from the local state if possible.
    // For simplicity, refetching the current page.
    fetchAllContentForAdmin(page);
    // A more advanced implementation could update the local 'allContent' state directly.
    // setAllContent(prevContent => prevContent.filter(item => item.id !== deletedContentId && item.parentContent !== deletedContentId)); // This is too simple for a tree
  };


  if (!user || user.role !== 'admin') {
    // This should ideally be handled by the ProtectedRoute in App.jsx
    return <p className="error-message text-center">Access Denied. You must be an admin to view this page.</p>;
  }

  return (
    <div className="admin-dashboard">
      <h1 className="text-center my-1">Admin Dashboard - Content Management</h1>

      {loading && <LoadingSpinner />}
      {error && <p className="error-message text-center">{error}</p>}

      {!loading && !error && allContent.length > 0 && (
        <ContentFamilyTree
            allContentItems={allContent}
            onContentDeleted={handleContentDeleted}
        />
      )}

      {!loading && !error && allContent.length === 0 && (
        <p className="text-center my-2">No content found in the system.</p>
      )}

      {/* Basic Pagination for Admin View */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '2rem', paddingBottom: '2rem' }}>
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

export default AdminDashboardPage;

// Rewrite/client/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Layout Components
import Navbar from './components/Layout/Navbar.jsx';
import Footer from './components/Layout/Footer.jsx';
import LoadingSpinner from './components/Common/LoadingSpinner.jsx';

// Page Components (Lazy Loaded)
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/Auth/SignupPage.jsx'));
const ReadPage = lazy(() => import('./pages/Read/ReadPage.jsx'));
const ArticleDetailPage = lazy(() => import('./pages/Read/ArticleDetailPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/Admin/AdminDashboardPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const ExplorePage = lazy(() => import('./pages/Explore/ExplorePage.jsx'));
const ExploreArticleDetailPage = lazy(() => import('./pages/Explore/ExploreArticleDetailPage.jsx'));

// Profile Page Component (Lazy Loaded)
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage.jsx'));


// ProtectedRoute component (remains the same)
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Original Read Flow Routes */}
            <Route path="/read" element={<ReadPage />} />
            <Route path="/read/:articleId" element={<ArticleDetailPage />} />

            {/* Explore Flow Routes */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:articleId" element={<ExploreArticleDetailPage />} />

            {/* Profile Page Route - MODIFIED to allow nested routes */}
            <Route path="/profile/:username/*" element={<ProfilePage />} />


            {/* Admin Routes */}
            <Route
              path="/admin/dashboard/*" // Also good practice for admin if it has sub-routes
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default App;

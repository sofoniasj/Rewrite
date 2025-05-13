// Rewrite/client/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Layout Components
import Navbar from './components/Layout/Navbar.jsx';
import Footer from './components/Layout/Footer.jsx';
import LoadingSpinner from './components/Common/LoadingSpinner.jsx'; // We'll create this

// Page Components (Lazy Loaded for better performance)
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/Auth/SignupPage.jsx'));
const ReadPage = lazy(() => import('./pages/Read/ReadPage.jsx'));
const ArticleDetailPage = lazy(() => import('./pages/Read/ArticleDetailPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/Admin/AdminDashboardPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx')); // We'll create this

// ProtectedRoute component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />; // Or some placeholder
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />; // Or a specific "access denied" page
  }

  return children;
}

function App() {
  return (
    <>
      <Navbar />
      <main className="container"> {/* Add a main container for consistent padding/width */}
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/read" element={<ReadPage />} />
            <Route path="/read/:articleId" element={<ArticleDetailPage />} />

            {/* Protected Routes (User must be logged in) */}
            {/* Example: <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> */}

            {/* Admin Routes (User must be logged in AND be an admin) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Fallback for unmatched routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default App;

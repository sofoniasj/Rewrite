import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ArticleProvider } from './contexts/ArticleContext';
import { AdminProvider } from './contexts/AdminContext';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import PrivateRoute from './components/Routing/PrivateRoute';
import AdminRoute from './components/Routing/AdminRoute';

// Pages
import HomePage from './pages/HomePage';
import SignupPage from './pages/Auth/SignupPage';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import EmailVerificationPage from './pages/Auth/EmailVerificationPage';
import ProfilePage from './pages/User/ProfilePage';
import SettingsPage from './pages/User/SettingsPage';
import ArticleDetailPage from './pages/Content/ArticleDetailPage';
import ArticleNewPage from './pages/Content/ArticleNewPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import NotFoundPage from './pages/Common/NotFoundPage';

// CSS
import './styles/main.css';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ArticleProvider>
          <AdminProvider>
            <Navbar />

            
              <Routes>

                {/* Public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/verify-email/:token" element={<EmailVerificationPage />} />

                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/read/:articleId" element={<ArticleDetailPage />} />
                <Route path="/read/:articleId/:versionId" element={<ArticleDetailPage />} />

                {/* Private */}
                <Route path="/new" element={<PrivateRoute element={ArticleNewPage} />} />
                <Route path="/settings" element={<PrivateRoute element={SettingsPage} />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminRoute element={AdminDashboard} />} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            

            <Footer />
          </AdminProvider>
        </ArticleProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

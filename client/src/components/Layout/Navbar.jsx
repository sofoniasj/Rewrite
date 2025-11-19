// Rewrite/client/src/components/Layout/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaCog, FaHome, FaBookOpen, FaCompass } from 'react-icons/fa'; // Added more icons

const Navbar = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          Draft
        </Link>
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end title="Home">
              <FaHome style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Home
            </NavLink>
          </li>
         

          {loading ? (
            <li>Loading User...</li>
          ) : isAuthenticated && user ? ( // Ensure user object exists
            <>
              {user.role === 'admin' && (
                 <li>
                    <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} title="Admin Dashboard">
                      <FaCog style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Admin
                    </NavLink>
                 </li>
              )}
              <li>
                {/* Clickable username linking to profile page */}
                <NavLink
                  to={`/profile/${user.username}`} // Navigate to /profile/username
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  title="My Profile"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <FaUser style={{ marginRight: '5px', verticalAlign: 'middle' }} /> {user.username}
                </NavLink>
              </li>
              <li>
                <button onClick={handleLogout} className="btn btn-link" title="Logout">
                  <FaSignOutAlt style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink to="/login" className={({ isActive }) => `btn btn-outline-primary btn-sm ${isActive ? 'active' : ''}`} title="Login">
                   <FaSignInAlt style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" className={({ isActive }) => `btn btn-primary btn-sm ${isActive ? 'active' : ''}`} title="Sign Up">
                   <FaUserPlus style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Sign Up
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

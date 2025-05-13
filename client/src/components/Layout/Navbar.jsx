// Rewrite/client/src/components/Layout/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaCog } from 'react-icons/fa'; // Example icons

const Navbar = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Navigation is handled within the logout function in AuthContext
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          Rewrite
        </Link>
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end> {/* 'end' prevents matching parent routes */}
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/read" className={({ isActive }) => (isActive ? 'active' : '')}>
              Read Articles
            </NavLink>
          </li>
          {loading ? (
            <li>Loading...</li> // Or a small spinner
          ) : isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                 <li>
                    <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                      <FaCog style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Admin
                    </NavLink>
                 </li>
              )}
              <li>
                <span style={{ color: '#555', marginRight: '15px' }}>
                  <FaUser style={{ marginRight: '5px', verticalAlign: 'middle' }} /> {user?.username}
                </span>
              </li>
              <li>
                <button onClick={handleLogout} className="btn btn-link">
                  <FaSignOutAlt style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink to="/login" className={({ isActive }) => `btn btn-secondary btn-sm ${isActive ? 'active' : ''}`}>
                   <FaSignInAlt style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" className={({ isActive }) => `btn btn-primary btn-sm ${isActive ? 'active' : ''}`}>
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

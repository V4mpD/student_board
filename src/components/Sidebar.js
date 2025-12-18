import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaComments, FaBullhorn, FaCalendarAlt, 
  FaUniversity, FaMicrosoft, FaGlobeEurope, 
  FaMoon, FaSun, FaUserCircle, FaCog, FaSignOutAlt, FaUser, FaThLarge
} from 'react-icons/fa';

const Sidebar = ({ isDarkMode, toggleTheme }) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sidebar">
      
      {/* 1. Header */}
      <div className="sidebar-header">
         <h3 className="m-0 fw-bold d-flex align-items-center" style={{ letterSpacing: '1px' }}>
           <FaUniversity className="me-2"/> UniHub
         </h3>
      </div>

      {/* 2. Main Navigation */}
      <nav className="d-flex flex-column flex-grow-1">
        <small className="text-uppercase text-white-50 ms-3 mb-2 fw-bold" style={{fontSize: '0.7rem'}}>Menu</small>
        
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaThLarge className="me-3"/> Dashboard
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaComments className="me-3"/> Groups
        </NavLink>
        <NavLink to="/announcements" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaBullhorn className="me-3"/> News
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaCalendarAlt className="me-3"/> Schedule
        </NavLink>
      </nav>

      {/* 3. Bottom Section */}
      <div className="mt-auto">
        
        {/* A. Quick Links (OUTSIDE the relative container so they stay put) */}
        <div className="mb-3">
          <small className="text-uppercase text-white-50 ms-3 mb-2 d-block fw-bold" style={{fontSize: '0.7rem'}}>Quick Links</small>
          <a href="https://www.rau.ro" target="_blank" rel="noopener noreferrer">
            <FaGlobeEurope className="me-3" style={{color: '#4db6ac'}}/> RAU Website
          </a>
          <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer">
            <FaMicrosoft className="me-3" style={{color: '#7986cb'}}/> MS Teams
          </a>
          <a href="https://solaris.rau.ro" target="_blank" rel="noopener noreferrer">
            <FaUniversity className="me-3" style={{color: '#ffb74d'}}/> Smartums
          </a>
        </div>

        {/* Separator */}
        <hr className="my-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}/>

        {/* B. Profile Wrapper (Relative Anchor for the Menu) */}
        <div className="position-relative" ref={menuRef}>
          
          {/* THE POPUP MENU */}
          {showMenu && (
            <div 
              className="card position-absolute shadow-lg border-0 mb-2 p-2" 
              style={{ 
                bottom: '100%', /* Sits exactly on top of the button */
                left: '0', 
                width: '100%', 
                backgroundColor: 'var(--bg-card)', 
                zIndex: 1050,
                // opacity: 0.95, /* 5-10% Transparency */
                // backdropFilter: 'blur(5px)', /* Glass effect over Quick Links */
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
               {/* Menu Items */}
               <button className="btn btn-sm text-start w-100 mb-1 d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                  <FaUser className="me-2" style={{color: 'var(--icons-color)'}}/> Profile
               </button>
               <button className="btn btn-sm text-start w-100 mb-2 d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                  <FaCog className="me-2" style={{color: 'var(--icons-color)'}}/> Settings
               </button>

               <hr className="my-1" style={{ borderColor: 'var(--border-color)' }}/>

               <button 
                  onClick={toggleTheme}
                  className="btn btn-sm text-start w-100 mb-1 d-flex align-items-center justify-content-between"
                  style={{ color: 'var(--text-main)' }}
               >
                  <span className="d-flex align-items-center">{isDarkMode ? <FaSun className="text-warning me-2"/> : <FaMoon className="text-secondary me-2"/>} Dark Mode</span>
                  
               </button>

               <hr className="my-1" style={{ borderColor: 'var(--border-color)' }}/>

               <button 
                  onClick={logout}
                  className="btn btn-sm text-start w-100 text-danger d-flex align-items-center fw-bold"
               >
                  <FaSignOutAlt className="me-2"/> Log Out
               </button>
            </div>
          )}

          {/* THE TRIGGER BUTTON */}
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="btn w-100 d-flex align-items-center p-2 border-0"
            style={{ 
              backgroundColor: showMenu ? 'rgba(255,255,255,0.1)' : 'transparent', 
              borderRadius: '10px',
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            <FaUserCircle size={32} className="me-3" style={{ color: 'var(--text-sidebar)' }}/>
            <div className="text-start overflow-hidden">
              <div className="fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>
                {user?.username || 'Guest'}
              </div>
              <div className="small text-white-50 text-truncate" style={{ fontSize: '0.75rem' }}>
                {user?.role === 'ADMIN' ? 'Administrator' : 'Student'}
              </div>
            </div>
          </button>
        </div>

      </div>
      
    </div>
  );
};

export default Sidebar;
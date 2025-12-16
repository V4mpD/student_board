import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaComments, FaBullhorn, FaCalendarAlt, 
  FaUniversity, FaMicrosoft, FaGlobeEurope, 
  FaMoon, FaSun 
} from 'react-icons/fa';

const Sidebar = ({ isDarkMode, toggleTheme }) => {
  return (
    <div className="sidebar">
      
        {/* Sidebar Header */}
      <div className="sidebar-header">
         <h3 className="m-0 fw-bold d-flex align-items-center" style={{ letterSpacing: '1px' }}>
           <FaUniversity className="me-2"/> Stud Board
         </h3>
      </div>

      {/* Main Navigation */}
      <nav className="d-flex flex-column">
        <small className="text-uppercase text-white-50 ms-3 mb-2 fw-bold" style={{fontSize: '0.7rem'}}>Menu</small>
        
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaComments className="me-3"/> Groups
        </NavLink>
        <NavLink to="/announcements" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaBullhorn className="me-3"/> News
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaCalendarAlt className="me-3"/> Schedule
        </NavLink>
      </nav>

      <div className="mt-auto">
        
        {/* Quick Links Section */}
        <div className="mb-4">
          <small className="text-uppercase text-white-50 ms-3 mb-2 d-block fw-bold" style={{fontSize: '0.7rem'}}>Quick Links</small>
          
          <a href="https://www.rau.ro" target="_blank" rel="noopener noreferrer">
            <FaGlobeEurope className="me-3" style={{color: '#4db6ac'}}/> RAU Website
          </a>
          <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer">
            <FaMicrosoft className="me-3" style={{color: '#7986cb'}}/> MS Teams
          </a>
          <a href="#https://solaris.rau.ro/as/dashboard" target="_blank" rel="noopener noreferrer">
            <FaUniversity className="me-3" style={{color: '#ffb74d'}}/> Smartums
          </a>
        </div>

        {/* Dark Mode Toggle */}
        <div className="pt-3 border-top border-secondary">
          <button 
            onClick={toggleTheme} 
            className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center"
            style={{borderRadius: '12px', padding: '10px'}}
          >
            {isDarkMode ? <FaSun className="me-2"/> : <FaMoon className="me-2"/>}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default Sidebar;
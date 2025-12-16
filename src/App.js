import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Chat from './pages/Chat';
import Announcements from './pages/Announcements';
import Calendar from './pages/Calendar';
import './App.css';

function App() {
  // Check local storage for theme preference, default to false (Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply the theme to the HTML body whenever it changes
  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <Router>
      <div className="app-container">
        {/* Pass the theme state and toggle function to Sidebar */}
        <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/calendar" element={<Calendar />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
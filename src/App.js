import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Chat from './pages/Chat';
import Announcements from './pages/Announcements';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './App.css';



// --- LAYOUT COMPONENT ---
const Layout = ({ children, isDarkMode, toggleTheme }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (loading) return null;

  if (!user && !isAuthPage) {
    return <Navigate to="/login" />;
  }

  if (user && isAuthPage) {
    return <Navigate to="/" />;
  }

  return (
    <div className='app-container'>
      {!isAuthPage && <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}

      <div className={!isAuthPage ? "content-area" : "w-100"}>
        {children}
      </div>
    </div>
  )
}

function App() {
  // Check local storage for theme preference, default to false (Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');


  // Apply the theme to the HTML body whenever it changes
  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(p => !p);

  return (
    <AuthProvider>
      <Router>
        <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />

            {/* The rest of the fish stew */}
            <Route path='/' element={<Dashboard />} />
            <Route path='/chat' element={<Chat />} />
            <Route path='/announcements' element={<Announcements />} />
            <Route path='/calendar' element={<Calendar />} />

          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
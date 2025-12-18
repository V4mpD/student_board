import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaClock, FaCalendarDay, FaBullhorn, FaPlay, FaPause, FaRedo } from 'react-icons/fa';
import { set } from 'date-fns';
import Loading from '../components/Loading';

const Dashboard = () => {
    const { user } = useAuth();
    const [time, setTime] = useState(new Date());

    // Data states
    const [todayClasses, setTodayClasses] = useState([]);
    const [latestNews, setLatestNews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Focus timer states
    const [timerLeft, setTimerLeft] = useState(25 * 60); // 25 minutes
    const [isTimerActive, setIsTimerActive] = useState(false);

    // Clock and greeting logic
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Greetings based on time of day
    const getGreeting = () => {
        const hour = time.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Focus timer logic
    useEffect(() => {
        let interval = null;

        if (isTimerActive && timerLeft > 0) {
            interval = setInterval(() => setTimerLeft((t) => t - 1), 1000);
        } else if (timerLeft === 0) {
            setIsTimerActive(false);
            alert('Focus session completed! Time to take a break.');
        }
        return () => clearInterval(interval);
    }, [isTimerActive, timerLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Fetch data for news and schedule
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            
            try{
                // Fetch schedule
                const scheduleRes = await fetch(`http://localhost:5000/api/schedule?groupName=${encodeURIComponent(user.groupName)}&weekType=all`);
                const scheduleData = await scheduleRes.json();


                // Filter today's classes
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const currentDayName = dayNames[new Date().getDay()]
                
                const todays = scheduleData.filter(item =>
                    item.day_of_week === currentDayName ||
                    (item.specific_date && new Date(item.specific_date).toDateString() === new Date().toDateString())
                );

                // Sort by time
                todays.sort((a, b) => a.start_time.localeCompare(b.start_time));
                setTodayClasses(todays);


                // Fetch news
                const newsRes = await fetch(`http://localhost:5000/api/announcements?faculty=${encodeURIComponent(user.faculty)}`);
                const newsData = await newsRes.json();
                setLatestNews(newsData.slice(0, 2)); // Get latest 2 news
        
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (isLoading) {
        return <Loading />;
    }

    return (
    <div className="container-fluid page-padding">
      <h2 className="mb-4 fw-bold">Dashboard</h2>
      
      {/* BENTO GRID LAYOUT */}
      <div className="row g-4">
        
        {/* WIDGET 1: GREETING (Wide Top-Left) */}
        <div className="col-md-8">
          <div className="card h-100 p-4 border-0 text-white" style={{ background: 'linear-gradient(135deg, var(--bg-sidebar) 0%, var(--accent-color) 100%)' }}>
            <div className="d-flex justify-content-between align-items-center h-100">
              <div>
                <h1 className="fw-bold mb-1">{getGreeting()}, {user?.username}! 👋</h1>
                <p className="lead mb-0 opacity-75">Ready to conquer the day?</p>
                <div className="mt-3 badge bg-white text-dark p-2">
                  <FaCalendarDay className="me-2"/>
                  {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              <div className="display-1 opacity-25 d-none d-lg-block">
                <FaClock />
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 2: FOCUS TIMER (Small Top-Right) */}
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm text-center p-3">
            <h5 className="text-muted mb-3">⚡ Focus Zone</h5>
            <div className="display-4 fw-bold mb-3" style={{ fontFamily: 'monospace' }}>
              {formatTime(timerLeft)}
            </div>
            <div className="d-flex justify-content-center gap-2">
              <button 
                className={`btn ${isTimerActive ? 'btn-warning' : 'btn-success'} rounded-pill px-4`}
                onClick={() => setIsTimerActive(!isTimerActive)}
              >
                {isTimerActive ? <><FaPause className="me-2"/> Pause</> : <><FaPlay className="me-2"/> Start</>}
              </button>
              <button 
                className="btn btn-outline-secondary rounded-circle"
                onClick={() => { setIsTimerActive(false); setTimerLeft(25 * 60); }}
              >
                <FaRedo />
              </button>
            </div>
          </div>
        </div>

        {/* WIDGET 3: UP NEXT (Schedule) */}
        <div className="col-md-6 col-lg-7">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center mt-2 mx-2">
              <h5 className="mb-0 fw-bold">📅 Today's Schedule</h5>
              <Link to="/calendar" className="text-decoration-none small">View Full Calendar →</Link>
            </div>
            <div className="card-body">
              {isLoading ? <p>Loading...</p> : todayClasses.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <h5>🎉 No classes today!</h5>
                  <p>Enjoy your free time.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {todayClasses.map((item, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h6 className="mb-0 fw-bold">{item.course_name}</h6>
                        <small className="text-muted"><FaClock className="me-1"/>{item.start_time} - {item.end_time} • {item.location}</small>
                      </div>
                      <span className="badge bg-primary rounded-pill">Class</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 4: NEWS (Announcements) */}
        <div className="col-md-6 col-lg-5">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center mt-2 mx-2">
              <h5 className="mb-0 fw-bold">📢 Latest News</h5>
              <Link to="/announcements" className="text-decoration-none small">All News →</Link>
            </div>
            <div className="card-body">
              {isLoading ? <p>Loading...</p> : latestNews.length === 0 ? (
                <p className="text-muted text-center py-4">No updates available.</p>
              ) : (
                latestNews.map(news => (
                  <div key={news.id} className="card mb-3 border bg-light">
                    <div className="card-body p-3">
                      <h6 className="card-title fw-bold mb-1">{news.title}</h6>
                      <p className="card-text small text-muted text-truncate">{news.content}</p>
                      <small className="text-primary" style={{fontSize: '0.75rem'}}>
                         Posted by {news.author_name || 'Admin'}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
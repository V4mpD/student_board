import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Modal, Button } from 'react-bootstrap'; // Import components for Delete Modal
import AddEventModal from '../components/AddEventModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-GB': enGB };
const localizer = dateFnsLocalizer({
    format, parse, startOfWeek, getDay, locales,
});

const Calendar = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    
    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // --- 1. ACADEMIC INTERVALS LOGIC ---
    const getAcademicRanges = () => {
        const now = new Date();
        // Calculate "Start Year" (If we are in Jan 2026, academic year started Sep 2025)
        const currentYear = now.getFullYear();
        const startYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
        const nextYear = startYear + 1;

        // Your Exact Intervals
        return [
            { start: new Date(startYear, 8, 29), end: new Date(startYear, 11, 21) }, // 29.09 - 21.12
            { start: new Date(nextYear, 0, 21), end: new Date(nextYear, 0, 25) },    // 21.01 - 25.01
            { start: new Date(nextYear, 1, 23), end: new Date(nextYear, 3, 5) },     // 23.02 - 05.04
            { start: new Date(nextYear, 3, 15), end: new Date(nextYear, 5, 7) }      // 15.04 - 07.06
        ];
    };

    // --- 2. DATA TRANSFORMER ---
    const processData = (scheduleData = [], deadlineData = []) => {
        const allEvents = [];
        const ranges = getAcademicRanges();

        if (Array.isArray(scheduleData)) {
            scheduleData.forEach(item => {
                if (!item) return;

                // TYPE A: ONE-TIME (Exams/Specific Events) - Show regardless of ranges
                if (item.specific_date) {
                    allEvents.push({
                        id: item.id,
                        title: `${item.course_name} (${item.location})`,
                        start: new Date(`${item.specific_date}T${item.start_time}`),
                        end: new Date(`${item.specific_date}T${item.end_time}`),
                        isSpecial: true,
                        source: 'schedule' // Mark source for deletion
                    });
                } 
                // TYPE B: RECURRING (Weekly Classes) - Respect Ranges!
                else if (item.day_of_week && item.start_time && item.end_time) {
                    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                    const targetDay = dayMap[item.day_of_week];

                    if (targetDay !== undefined) {
                        // Loop through ONLY the active academic ranges
                        ranges.forEach(range => {
                            let current = new Date(range.start);
                            // Advance to the first occurrence of the target day in this range
                            while (current.getDay() !== targetDay) {
                                current.setDate(current.getDate() + 1);
                            }

                            // Generate weekly until range end
                            while (current <= range.end) {
                                const [sH, sM] = item.start_time.split(':');
                                const [eH, eM] = item.end_time.split(':');
                                
                                const start = new Date(current); start.setHours(sH, sM, 0);
                                const end = new Date(current); end.setHours(eH, eM, 0);

                                allEvents.push({
                                    id: item.id, // Database ID (needed for delete)
                                    title: `${item.course_name} (${item.location})`,
                                    start, end,
                                    isSpecial: false,
                                    source: 'schedule'
                                });

                                // Jump to next week
                                current.setDate(current.getDate() + 7);
                            }
                        });
                    }
                }
            });
        }

        // TYPE C: DEADLINES
        if (Array.isArray(deadlineData)) {
            deadlineData.forEach(item => {
                if (!item || !item.due_date) return;
                const due = new Date(item.due_date);
                allEvents.push({
                    id: item.id,
                    title: `⚠️ DUE: ${item.title} (${item.course_name})`,
                    start: due,
                    end: new Date(due.getTime() + 60*60*1000),
                    isSpecial: true,
                    source: 'assignment' // Mark source for deletion
                });
            });
        }

        return allEvents.filter(e => e && e.title && e.start && e.end);
    };

    // --- 3. API ACTIONS ---
    const fetchAllEvents = useCallback(async () => {
        if (!user) return;
        try {
            const [resSchedule, resDeadlines] = await Promise.all([
                fetch(`http://localhost:5000/api/schedule?groupName=${encodeURIComponent(user.groupName)}&weekType=all`),
                fetch(`http://localhost:5000/api/deadlines?groupName=${encodeURIComponent(user.groupName)}`)
            ]);

            const scheduleData = await resSchedule.json();
            const deadlineData = await resDeadlines.json();

            const combinedEvents = processData(scheduleData, deadlineData);
            setEvents(combinedEvents);
        } catch (err) {
            console.error("Calendar fetch error:", err);
            setEvents([]);
        }
    }, [user]);

    useEffect(() => {
        fetchAllEvents();
    }, [fetchAllEvents]);

    // Handle Event Click
    const handleSelectEvent = (event) => {
        if (user?.role === 'ADMIN') {
            setSelectedEvent(event);
            setShowDeleteModal(true);
        }
    };

    // Handle Delete Confirmation
    const handleDelete = async () => {
        if (!selectedEvent) return;
        
        // Determine endpoint based on source
        const endpoint = selectedEvent.source === 'assignment' 
            ? `http://localhost:5000/api/assignments/${selectedEvent.id}`
            : `http://localhost:5000/api/schedule/${selectedEvent.id}`;

        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (res.ok) {
                fetchAllEvents();
                setShowDeleteModal(false);
            } else {
                alert("Failed to delete event.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting event.");
        }
    };

    const eventStyleGetter = (event) => ({
        style: {
            backgroundColor: event.isSpecial ? 'var(--accent-color)' : '#0d6efd',
            borderRadius: '5px', opacity: 0.9, color: 'white', border: '0px', display: 'block'
        }
    });

    return (
        <div className='container-fluid page-padding h-100 d-flex flex-column'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
                <h2>📅 Academic Calendar</h2>
                {user?.role === 'ADMIN' && (
                    <button 
                        className="btn btn-primary d-flex align-items-center gap-2"
                        onClick={() => setShowAddModal(true)}
                    >
                        <FaPlus /> Add Event
                    </button>
                )}
            </div>

            <div className='flex-grow-1' style={{ height: '80vh', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    min={new Date(0,0,0,8,0,0)}
                    max={new Date(0,0,0,20,0,0)}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={handleSelectEvent} // Enables clicking events
                />
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    <Modal.Title>Delete Event?</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    <p>Are you sure you want to delete <strong>{selectedEvent?.title}</strong>?</p>
                    <p className="text-danger small">Note: If this is a weekly class, all occurrences will be removed.</p>
                </Modal.Body>
                <Modal.Footer style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-color)' }}>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}><FaTrash/> Delete</Button>
                </Modal.Footer>
            </Modal>

            {/* ADD EVENT MODAL */}
            {user?.role === 'ADMIN' && (
                <AddEventModal 
                    show={showAddModal} 
                    handleClose={() => setShowAddModal(false)} 
                    refreshCalendar={fetchAllEvents} 
                />
            )}
        </div>
    );
};

export default Calendar;
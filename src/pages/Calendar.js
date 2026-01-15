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
    const getAcademicRanges = useCallback((semesterId) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
        const nextYear = startYear + 1;

        // Define strict ranges for each semester
        if (semesterId === 1) {
            return [
                { start: new Date(startYear, 8, 29), end: new Date(startYear, 11, 23) }, // Sep - Dec
                { start: new Date(nextYear, 0, 5), end: new Date(nextYear, 0, 20) }      // Jan (Exam Session)
            ];
        } else {
            return [
                { start: new Date(nextYear, 1, 23), end: new Date(nextYear, 5, 7) }      // Feb - Jun
            ];
        }
    }, []); // No dependencies needed here
    
    // --- 2. DATA TRANSFORMER ---
    const processData = useCallback((scheduleData = [], deadlineData = []) => {
        const allEvents = [];
        
        // NOTE: We no longer fetch 'ranges' here globally.
        // We fetch them per item inside the loop.

        if (Array.isArray(scheduleData)) {
            scheduleData.forEach(item => {
                if (!item) return;

                // 1. Determine which semester this specific class belongs to (Default to 1)
                const itemSemester = item.semester || 1;

                // 2. Get the valid Academic Ranges for THIS item's semester
                const ranges = getAcademicRanges(itemSemester);

                // DEFINE ANCHOR DATE FOR ODD/EVEN CALCULATION ---
                // "Week 1" is always the start of the first range of the semester.
                // (e.g., Sep 29 for Sem 1, Feb 23 for Sem 2)
                const semesterStart = ranges[0].start;

                // TYPE A: ONE-TIME (Exams/Specific Events)
                if (item.specific_date) {
                    allEvents.push({
                        id: item.id,
                        title: `${item.course_name} (${item.location})`,
                        start: new Date(`${item.specific_date}T${item.start_time}`),
                        end: new Date(`${item.specific_date}T${item.end_time}`),
                        isSpecial: true,
                        source: 'schedule',
                        resource: item 
                    });
                } 
                // TYPE B: RECURRING (Weekly Classes) - Uses the Semester Ranges!
                else if (item.day_of_week && item.start_time && item.end_time) {
                    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                    const targetDay = dayMap[item.day_of_week];

                    if (targetDay !== undefined) {
                        // Loop through the ranges valid for THIS item's semester
                        ranges.forEach(range => {
                            let current = new Date(range.start);
                            
                            // Advance to the first occurrence of the target day
                            while (current.getDay() !== targetDay) {
                                current.setDate(current.getDate() + 1);
                            }

                            // Generate weekly events until range end
                            while (current <= range.end) {
                                // --- 2. CALCULATE WEEK PARITY ---
                                // Get difference in weeks from the Semester Start
                                const diffTime = Math.abs(current - semesterStart);
                                const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)); 
                                
                                // Week 1 (diff=0) is Odd. Week 2 (diff=1) is Even.
                                const isOddWeek = (diffWeeks % 2) === 0; 

                                // --- 3. FILTER BASED ON WEEK TYPE ---
                                let shouldShow = true;
                                if (item.week_type === 'odd' && !isOddWeek) shouldShow = false;
                                if (item.week_type === 'even' && isOddWeek) shouldShow = false;

                                if (shouldShow) {
                                    const [sH, sM] = item.start_time.split(':');
                                    const [eH, eM] = item.end_time.split(':');
                                    
                                    const start = new Date(current); start.setHours(sH, sM, 0);
                                    const end = new Date(current); end.setHours(eH, eM, 0);

                                    allEvents.push({
                                        id: item.id,
                                        title: `${item.course_name} (${item.location})`,
                                        start, end,
                                        isSpecial: false,
                                        source: 'schedule',
                                        resource: item
                                    });
                                }

                                // Next week
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
                    source: 'assignment',
                    resource: item
                });
            });
        }

        return allEvents.filter(e => e && e.title && e.start && e.end);
    }, [getAcademicRanges]);

    // --- 3. API ACTIONS ---
    const fetchAllEvents = useCallback(async () => {
        if (!user) return;
        try {
            const [resSchedule, resDeadlines] = await Promise.all([
                fetch(`/api/schedule?groupName=${encodeURIComponent(user.groupName)}&weekType=all`),
                fetch(`/api/deadlines?groupName=${encodeURIComponent(user.groupName)}`)
            ]);

            const scheduleData = await resSchedule.json();
            const deadlineData = await resDeadlines.json();

            const combinedEvents = processData(scheduleData, deadlineData);
            setEvents(combinedEvents);
        } catch (err) {
            console.error("Calendar fetch error:", err);
            setEvents([]);
        }
    }, [user, processData]); // processData is now a stable dependency

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
            ? `/api/assignments/${selectedEvent.id}`
            : `/api/schedule/${selectedEvent.id}`;

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
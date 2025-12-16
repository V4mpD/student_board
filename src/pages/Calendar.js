import React, { useEffect, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import Loading from '../components/Loading';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-GB': enGB,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const Calendar = () => {
   const [events, setEvents] = useState([]);
   const [isLoading, setIsLoading] = useState(true);

   const [view, setView] = useState('work_week');
   const [date, setDate] = useState(new Date());

   // Function for recurring events
   const generateRecurringEvents = (data) => {
      const allEvents = [];
      const semesterStart = new Date();
      semesterStart.setDate(semesterStart.getDate() - semesterStart.getDay());

      const weeksToGenerate = 16; // cba to check how much is one semester

      data.forEach(item => {

        // CASE 1: ONE TIME EVENTS (exams, deadlines)
        if (item.specific_date) {
            const start = new Date(`${item.specific_date}T${item.start_time || '00:00'}`);
            const end = item.end_time
                ? new Date(`${item.specific_date}T${item.end_time}`)
                : new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour
            
            allEvents.push({
                title: item.course_name,
                start: start,
                end: end,
                resource: item,
                isSpecial: true, // Flag for styling
        });
        }

        // CASE 2: RECURRING EVENTS (lectures, labs)
        else if (item.day_of_week) {
            const dayMap = {'Monday': 1,'Tuesday': 2,'Wednesday': 3,'Thursday': 4,'Friday': 5,'Saturday': 6,'Sunday': 0};
            const targetDay = dayMap[item.day_of_week];

            // Loop through the semester weeks
            for (let i = 0; i < weeksToGenerate; i++) {
                const currentWeekDate = new Date(semesterStart);
                currentWeekDate.setDate(semesterStart.getDate() + (i * 7));

                // Calculate the day of the "Target Day" in the current week
                const dayDiff = targetDay - currentWeekDate.getDay();
                const classDate = new Date(currentWeekDate);
                classDate.setDate(currentWeekDate.getDate() + dayDiff);

                // Skip if this specific instance is in the past
                // Set Start/End
                const [startH, startM] = item.start_time.split(':');
                const [endH, endM] = item.end_time.split(':');

                const start = new Date(classDate);
                start.setHours(startH, startM, 0);

                const end = new Date(classDate);
                end.setHours(endH, endM, 0);

                // Handle Odd/Even week logic
                allEvents.push({
                    title: `${item.course_name} (${item.location})`,
                    start: start,
                    end: end,
                    resource: item,
                    isSpecial: false, // Flag for styling
                });
            }
        }
      });

      return allEvents;
   };
    useEffect(() => {

      const fetchSchedule = async () => {
        try {
          const groupName = 'Grupa 621';
          const res = await fetch(`http://localhost:5000/api/schedule?group=${encodeURIComponent(groupName)}`);
          const data = await res.json();

          const calendarEvents = generateRecurringEvents(data);
          setEvents(calendarEvents);
        } catch (err) {
          console.error('Error fetching schedule YAY:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSchedule();
    }, []);

    // Custom styling for events
    const eventStyleGetter = (event) => {
        const backgroundColor = event.isSpecial ? 'var(--accent-color)' : '#0d6efd';
        return {
            style: {
                backgroundColor: backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
            }
        };
    };

    if (isLoading) {
        return (<Loading />);
    }

    return (
        <div className='container-flui page-padding h-100 d-flex flex-column'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
                <h2>📅 Calendar Academic</h2>
                {/*!!!!!!!!!!!!!!!!!!!!!!!!!! SPACE FOR THE ADD EVENT BUTTON!!!!!!!!!!!!!!!!!!!! */}
            </div>

            <div className='flex-glow-1' style={{ height: '80vh', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    
                    view={view}
                    date={date}
                    onView={(newView) => setView(newView)}
                    onNavigate={(newDate) => setDate(newDate)}

                    views={['month', 'work_week', 'day', 'agenda']}
                    min={new Date(0,0,0,8,0,0)} // Start the calendar at 8:00 since no human being attends classes earlier
                    max={new Date(0,0,0,20,0,0)} // Same shit as above but at night
                    eventPropGetter={eventStyleGetter}
                />
            </div>
        </div>
    );
};

export default Calendar;
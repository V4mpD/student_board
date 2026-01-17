import React, { useState, useEffect, useCallback } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  differenceInCalendarWeeks,
} from "date-fns";
import { enGB } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { FaPlus, FaTrash } from "react-icons/fa";
import { Modal, Button } from "react-bootstrap";
import AddEventModal from "../components/AddEventModal";
import API_BASE_URL from "../apiConfig";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-GB": enGB };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- 1. ACADEMIC CALENDAR CONFIGURATION ---
  const getAcademicRanges = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
    const nextYear = startYear + 1;

    const academicStart = new Date(startYear, 8, 29); // Sept 29

    return {
      academicStart,
      ranges: [
        { start: new Date(startYear, 8, 29), end: new Date(startYear, 11, 21) },
        { start: new Date(nextYear, 0, 12), end: new Date(nextYear, 0, 25) },
        { start: new Date(nextYear, 1, 23), end: new Date(nextYear, 3, 5) },
        { start: new Date(nextYear, 3, 15), end: new Date(nextYear, 5, 7) },
      ],
    };
  };

  // --- 2. DATA PROCESSOR ---
  const processData = (scheduleData = [], deadlineData = []) => {
    const allEvents = [];
    const { academicStart, ranges } = getAcademicRanges();

    // TIMEZONE FIX: Parse ISO string to Date object to preserve local day
    const mergeDateAndTime = (dateIsoString, timeStr) => {
      if (!dateIsoString || !timeStr) return null;
      const dateObj = new Date(dateIsoString);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const day = dateObj.getDate();
      const [h, m] = timeStr.split(":").map(Number);
      return new Date(year, month, day, h, m, 0);
    };

    if (Array.isArray(scheduleData)) {
      scheduleData.forEach((item) => {
        if (!item) return;

        // A: ONE-TIME EVENTS
        if (item.specific_date) {
          const start = mergeDateAndTime(item.specific_date, item.start_time);
          const end = mergeDateAndTime(item.specific_date, item.end_time);

          if (start && end) {
            allEvents.push({
              id: item.id,
              title: `${item.course_name} (${item.location || "No Room"})`,
              start,
              end,
              isSpecial: true,
              source: "schedule",
            });
          }
        }
        // B: WEEKLY EVENTS (All, Odd, Even)
        else if (item.day_of_week && item.start_time && item.end_time) {
          const dayMap = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
          };
          const targetDay = dayMap[item.day_of_week];

          if (targetDay !== undefined) {
            ranges.forEach((range) => {
              let current = new Date(range.start);

              // Align with target day
              while (current.getDay() !== targetDay) {
                current.setDate(current.getDate() + 1);
              }

              // Generate weeks
              while (current <= range.end) {
                // Parity Logic
                const weekDiff = differenceInCalendarWeeks(
                  current,
                  academicStart,
                  { weekStartsOn: 1 },
                );
                const weekNumber = weekDiff + 1;
                const isOddWeek = weekNumber % 2 !== 0;

                let shouldRender = true;
                if (item.week_type === "odd" && !isOddWeek)
                  shouldRender = false;
                if (item.week_type === "even" && isOddWeek)
                  shouldRender = false;
                if (item.week_type === "once") shouldRender = false;

                if (shouldRender) {
                  const [sH, sM] = item.start_time.split(":").map(Number);
                  const [eH, eM] = item.end_time.split(":").map(Number);

                  const start = new Date(current);
                  start.setHours(sH, sM, 0);
                  const end = new Date(current);
                  end.setHours(eH, eM, 0);

                  allEvents.push({
                    id: item.id,
                    title: `${item.course_name} (${item.location || "No Room"})`,
                    start,
                    end,
                    isSpecial: false,
                    source: "schedule",
                  });
                }
                current.setDate(current.getDate() + 7);
              }
            });
          }
        }
      });
    }

    // C: DEADLINES
    if (Array.isArray(deadlineData)) {
      deadlineData.forEach((item) => {
        if (!item || !item.due_date) return;
        const due = new Date(item.due_date);
        if (!isNaN(due)) {
          allEvents.push({
            id: item.id,
            title: `⚠️ DUE: ${item.title}`,
            start: due,
            end: new Date(due.getTime() + 60 * 60 * 1000),
            isSpecial: true,
            source: "assignment",
          });
        }
      });
    }

    return allEvents;
  };

  const fetchAllEvents = useCallback(async () => {
    if (!user) return;
    try {
      // FIX: Removed "&weekType=all" so backend returns EVERYTHING (Odd, Even, All)
      // This allows the frontend loop to filter them correctly.
      const [resSchedule, resDeadlines] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/schedule?groupName=${encodeURIComponent(user.groupName)}`,
        ),
        fetch(
          `${API_BASE_URL}/api/deadlines?groupName=${encodeURIComponent(user.groupName)}`,
        ),
      ]);

      const scheduleData = await resSchedule.json();
      const deadlineData = await resDeadlines.json();

      const combinedEvents = processData(
        Array.isArray(scheduleData) ? scheduleData : [],
        Array.isArray(deadlineData) ? deadlineData : [],
      );
      setEvents(combinedEvents);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      setEvents([]);
    }
  }, [user]);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  const handleSelectEvent = (event) => {
    if (user?.role === "ADMIN") {
      setSelectedEvent(event);
      setShowDeleteModal(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    const endpoint =
      selectedEvent.source === "assignment"
        ? `${API_BASE_URL}/api/assignments/${selectedEvent.id}`
        : `${API_BASE_URL}/api/schedule/${selectedEvent.id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
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
      backgroundColor: event.isSpecial
        ? "var(--accent-color, #e74c3c)"
        : "#0d6efd",
      borderRadius: "5px",
      opacity: 0.9,
      color: "white",
      border: "0px",
      display: "block",
    },
  });

  return (
    <div className="container-fluid page-padding h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>📅 Academic Calendar</h2>
        {user?.role === "ADMIN" && (
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus /> Add Event
          </button>
        )}
      </div>

      <div
        className="flex-grow-1"
        style={{
          height: "80vh",
          backgroundColor: "var(--bg-card)",
          padding: "20px",
          borderRadius: "15px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        }}
      >
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 20, 0, 0)}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
          }}
        >
          <Modal.Title>Delete Event?</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
          }}
        >
          <p>
            Are you sure you want to delete{" "}
            <strong>{selectedEvent?.title}</strong>?
          </p>
          <p className="text-danger small">
            {selectedEvent?.source === "schedule" && !selectedEvent?.isSpecial
              ? "This will delete ALL weekly occurrences of this class."
              : "This will delete this specific event."}
          </p>
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: "var(--bg-card)",
            borderTopColor: "var(--border-color)",
          }}
        >
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <FaTrash /> Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {user?.role === "ADMIN" && (
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

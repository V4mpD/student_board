import React from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import {
  FaClock,
  FaMapMarkerAlt,
  FaTrash,
  FaInfoCircle,
  FaCalendarAlt,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const EventDetailsModal = ({ show, handleClose, event, onDelete }) => {
  const { user } = useAuth();

  if (!event) return null;

  // Helper to format time range
  const formatTimeRange = (start, end) => {
    const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
    return `${start.toLocaleTimeString([], timeOptions)} - ${end.toLocaleTimeString([], timeOptions)}`;
  };

  // Helper to format full date
  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header
        closeButton
        style={{
          backgroundColor: "var(--bg-card)",
          color: "var(--text-main)",
          borderBottomColor: "var(--border-color)",
        }}
      >
        <Modal.Title className="d-flex align-items-center gap-2">
          {event.isSpecial ? "📝 Exam / Event" : "📚 Class Details"}{" "}
          {/* isSpecial not known */}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}
      >
        <h4 className="fw-bold mb-3">{event.title.replace(/\(.*\)/, "")}</h4>{" "}
        {/* Clean title */}
        <div className="d-flex flex-column gap-3">
          {/* Date */}
          <div className="d-flex align-items-center gap-3">
            <FaCalendarAlt className="text-primary" size={20} />
            <div>
              <small className="text-muted d-block">Date</small>
              <span className="fw-medium">{formatDate(event.start)}</span>{" "}
              {/* Event start? wut?*/}
            </div>
          </div>

          {/* Time */}
          <div className="d-flex align-items-center gap-3">
            <FaClock className="text-warning" size={20} />
            <div>
              <small className="text-muted d-block">Time</small>
              <span className="fw-medium">
                {formatTimeRange(event.start, event.end)}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="d-flex align-items-center gap-3">
            <FaMapMarkerAlt className="text-danger" size={20} />
            <div>
              <small className="text-muted d-block">Location</small>
              <span>
                {event.title.match(/\((.*?)\)/)?.[1] || "No Location"}
              </span>
            </div>
          </div>

          {/* Type Badge */}
          <div className="d-flex align-items-center gap-3">
            <FaInfoCircle className="text-info" size={20} />
            <div>
              <small className="text-muted d-block">Type</small>
              {event.source === "assignment" ? (
                <Badge bg="danger">Deadline</Badge>
              ) : event.isSpecial ? (
                <Badge bg="warning" text="dark">
                  Exam / One-Time
                </Badge>
              ) : (
                <Badge bg="primary">Weekly Class</Badge>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: "var(--bg-card)",
          borderTopColor: "var(--border-color)",
        }}
      >
        {user?.role === "ADMIN" && (
          <Button
            variant="outline-danger"
            onClick={() => {
              handleClose(); // Close details
              onDelete(event); // Trigger delete flow
            }}
            className="me-auto" // Pushes button to the left
          >
            <FaTrash className="me-2" /> Delete Event
          </Button>
        )}
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EventDetailsModal;

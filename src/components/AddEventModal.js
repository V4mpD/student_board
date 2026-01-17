import React, { useState } from "react";
import { Modal, Button, Form, Nav } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../apiConfig";

const AddEventModal = ({ show, handleClose, refreshCalendar }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("weekly");

  // Helper to calculate Day Name from a Date string
  const getDayName = (dateStr) => {
    if (!dateStr) return "Monday";
    const date = new Date(dateStr);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  const [formData, setFormData] = useState({
    course_name: "",
    location: "",
    day_of_week: "Monday",
    start_time: "08:00",
    end_time: "10:00",
    week_type: "everything",
    specific_date: "",
    target_group: user?.groupName || "",
    title: "",
    description: "",
  });

  // Local state to handle the UI selection of "Once" (which maps to 'all' in DB)
  const [uiFrequency, setUiFrequency] = useState("all");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "week_type") {
      setUiFrequency(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let endpoint = `${API_BASE_URL}/api/schedule`;

      // Base Payload
      let payload = {
        course_name: formData.course_name,
        location: formData.location,
        start_time: formData.start_time,
        end_time: formData.end_time,
        target_group: formData.target_group,
        created_by: user.id,
      };

      // === LOGIC BRANCHING ===

      if (activeTab === "deadline") {
        endpoint = `${API_BASE_URL}/api/assignments`;
        payload = {
          course_name: formData.course_name,
          title: formData.title,
          description: formData.description,
          // Use 'T' separator for Postgres TIMESTAMP compatibility
          due_date: `${formData.specific_date}T${formData.start_time}:00`,
          target_group: formData.target_group,
          created_by: user.id,
        };
      } else {
        // IT IS A SCHEDULE EVENT (Weekly or One-Time)

        if (activeTab === "one-time" || uiFrequency === "once") {
          // === TYPE: ONE TIME EVENT ===
          if (!formData.specific_date) {
            alert("Please select a date.");
            return;
          }
          payload.week_type = "all";
          payload.specific_date = formData.specific_date;
          payload.day_of_week = getDayName(formData.specific_date);
        } else {
          // === TYPE: RECURRING WEEKLY ===
          payload.week_type = uiFrequency;
          payload.specific_date = null;
          payload.day_of_week = formData.day_of_week;
        }
      }

      console.log("Submitting Payload:", payload); // Debugging

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        refreshCalendar();
        handleClose();
        // Reset fields
        setFormData((prev) => ({
          ...prev,
          title: "",
          description: "",
          specific_date: "",
          course_name: "",
          location: "",
        }));
      } else {
        const errData = await res.json();
        alert("Failed to add event: " + (errData.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
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
        <Modal.Title>📅 Add Academic Event</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}
      >
        <Nav variant="pills" className="mb-3 justify-content-center">
          <Nav.Item>
            <Nav.Link
              active={activeTab === "weekly"}
              onClick={() => setActiveTab("weekly")}
            >
              Weekly Class
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === "one-time"}
              onClick={() => setActiveTab("one-time")}
            >
              Exam / Event
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === "deadline"}
              onClick={() => setActiveTab("deadline")}
            >
              Deadline
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Target Group</Form.Label>
            <Form.Control
              name="target_group"
              value={formData.target_group}
              onChange={handleChange}
              placeholder="e.g. 621"
              required
              className="chat-input"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Event Title / Course Name</Form.Label>
            <Form.Control
              name="course_name"
              value={formData.course_name}
              onChange={handleChange}
              placeholder={
                activeTab === "weekly"
                  ? "e.g. Data Structures"
                  : "e.g. Marketing Exam"
              }
              required
              className="chat-input"
            />
          </Form.Group>

          {activeTab === "deadline" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Assignment Title</Form.Label>
                <Form.Control
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Homework 1"
                  required
                  className="chat-input"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  as="textarea"
                  className="chat-input"
                />
              </Form.Group>
            </>
          )}

          {activeTab === "weekly" && (
            <div className="row">
              <div className="col-6 mb-3">
                <Form.Label>Day</Form.Label>
                <Form.Select
                  name="day_of_week"
                  value={formData.day_of_week}
                  onChange={handleChange}
                  className="chat-input"
                  disabled={uiFrequency === "once"}
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-6 mb-3">
                <Form.Label>Frequency</Form.Label>
                <Form.Select
                  name="week_type"
                  value={uiFrequency}
                  onChange={handleChange}
                  className="chat-input"
                >
                  <option value="all">Every Week</option>
                  <option value="odd">Odd Weeks</option>
                  <option value="even">Even Weeks</option>
                  <option value="once">Once (Specific Date)</option>
                </Form.Select>
              </div>
            </div>
          )}

          {/* Date Picker shows for: One-Time, Deadline, OR Weekly set to 'once' */}
          {(activeTab === "one-time" ||
            activeTab === "deadline" ||
            (activeTab === "weekly" && uiFrequency === "once")) && (
            <Form.Group className="mb-3">
              <Form.Label>
                {activeTab === "deadline" ? "Due Date" : "Event Date"}
              </Form.Label>
              <Form.Control
                type="date"
                name="specific_date"
                value={formData.specific_date}
                onChange={handleChange}
                required
                className="chat-input"
              />
            </Form.Group>
          )}

          <div className="row">
            <div className="col-6 mb-3">
              <Form.Label>
                {activeTab === "deadline" ? "Due Time" : "Start Time"}
              </Form.Label>
              <Form.Control
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="chat-input"
              />
            </div>
            {activeTab !== "deadline" && (
              <div className="col-6 mb-3">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="chat-input"
                />
              </div>
            )}
          </div>

          {activeTab !== "deadline" && (
            <Form.Group className="mb-4">
              <Form.Label>Location / Room</Form.Label>
              <Form.Control
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="chat-input"
              />
            </Form.Group>
          )}

          <div
            className="d-flex justify-content-end border-top pt-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            <Button variant="secondary" onClick={handleClose} className="me-2">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Event
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddEventModal;

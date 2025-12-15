import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const Calendar = () => {
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  return (
    <div className="container py-4">

      <button className='btn btn-success mb-3' onClick={handleShow}>+ Add Event</button>
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Event Name</Form.Label>
              <Form.Control type="text" placeholder="e.g. Math Exam" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select>
                <option>Course</option>
                <option>Exam</option>
                <option>Deadline</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="datetime-local" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
          <Button variant="primary" onClick={handleClose}>Save Event</Button>
        </Modal.Footer>
      </Modal>

      <h2 className="mb-4">📅 Calendar Academic</h2>
      
      <div className="row">
        {/* Deadlines Column */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header bg-danger text-white">Termene Limită Apropiate</div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between align-items-center">
                Proiect Web
                <span className="badge bg-danger rounded-pill">Mâine</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center">
                Examen Baze de Date
                <span className="badge bg-warning text-dark rounded-pill">3 Zile</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Schedule Column */}
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">Programul Săptămânii</div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered text-center">
                  <thead className="table-light">
                    <tr>
                      <th>Time</th>
                      <th>Mon</th>
                      <th>Wed</th>
                      <th>Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>08:00</td>
                      <td className="table-primary">React Course (Lab 301)</td>
                      <td>-</td>
                      <td className="table-success">Sport</td>
                    </tr>
                    <tr>
                      <td>10:00</td>
                      <td>-</td>
                      <td className="table-info">Database Lecture (Hall A)</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
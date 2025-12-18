import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const AddAnnouncementModal = ({ show, handleClose, refreshNews }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    
    // Default to Global (NULL) or Faculty (e.g., IM)
    const [targetGroup, setTargetGroup] = useState(''); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title,
                content,
                posted_by: user.id,
                target_group: targetGroup || null // Send null for "Global"
            };

            const res = await fetch('http://localhost:5000/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                refreshNews(); 
                handleClose();
                setTitle('');
                setContent('');
            } else {
                alert("Failed to post announcement");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderBottomColor: 'var(--border-color)' }}>
                <Modal.Title>📢 New Announcement</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control 
                            required 
                            type="text" 
                            placeholder="e.g. Exam Session Schedule"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="chat-input"
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Target Audience</Form.Label>
                        <Form.Select 
                            value={targetGroup} 
                            onChange={(e) => setTargetGroup(e.target.value)}
                            className="chat-input"
                        >
                            <option value="">Global (Entire University)</option>
                            <option value={user.faculty}>{user.faculty} Only</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Content</Form.Label>
                        <Form.Control 
                            required 
                            as="textarea" 
                            rows={4} 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="chat-input"
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={handleClose} className="me-2">Cancel</Button>
                        <Button variant="primary" type="submit">Post News</Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default AddAnnouncementModal;
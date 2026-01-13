import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaArrowUp, FaUniversity, FaBuilding, FaUserFriends } from 'react-icons/fa';
import io from 'socket.io-client';

// Connect to Backend
const socket = io.connect();

const Chat = () => {
  const { user } = useAuth();
  
  const rooms = [
    { 
      id: 1, 
      name: `Grupa ${user?.groupName || '...'}`, 
      scope: 'group', 
      target: user?.groupName, 
      icon: <FaUserFriends/>,
      roomId: `group_${user?.groupName}` 
    },
    { 
      id: 2, 
      name: `Facultatea ${user?.faculty || '...'}`, 
      scope: 'faculty', 
      target: user?.faculty, 
      icon: <FaBuilding/>,
      roomId: `faculty_${user?.faculty}`
    },
    { 
      id: 3, 
      name: "University General", 
      scope: 'university', 
      target: 'MAIN', 
      icon: <FaUniversity/>,
      roomId: `uni_main`
    }
  ];

  const [activeRoom, setActiveRoom] = useState(rooms[0]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Load History + Join Room
  useEffect(() => {
    if (!user || !activeRoom.target) return;

    const loadRoom = async () => {
        setIsLoading(true);
        socket.emit("join_room", activeRoom.roomId);

        try {
            const params = new URLSearchParams({
                scope: activeRoom.scope,
                target: activeRoom.target
            });
            const res = await fetch(`/api/messages?${params}`);
            const data = await res.json();
            setMessages(data);
        } catch (err) {
            console.error("History fetch failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    loadRoom();
  }, [activeRoom, user]);

  // Listen for Incoming Messages
  useEffect(() => {
    const handleReceiveMessage = (data) => {
        if (data.scope === activeRoom.scope && data.target === activeRoom.target) {
            setMessages((list) => [...list, data]);
        }
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => {
        socket.off("receive_message", handleReceiveMessage);
    };
  }, [activeRoom]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
        sender_id: user.id,
        sender_name: user.username,
        content: newMessage,
        scope: activeRoom.scope,
        target: activeRoom.target,
        room_id: activeRoom.roomId,
    };

    socket.emit("send_message", messageData);
    setNewMessage("");
  };

  return (
    <div className="d-flex h-100 w-100">
      {/* LEFT SIDEBAR: ROOM LIST */}
      <div className="d-flex flex-column p-3 border-end" style={{ width: '280px', backgroundColor: 'var(--bg-card)' }}>
        <h5 className="mb-4 fw-bold px-2">Conversations</h5>
        <div className="list-group list-group-flush">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room)}
              className={`list-group-item list-group-item-action border-0 rounded-3 mb-2 d-flex align-items-center ${activeRoom.id === room.id ? 'active' : ''}`}
              style={{
                backgroundColor: activeRoom.id === room.id ? 'var(--accent-color)' : 'transparent',
                color: activeRoom.id === room.id ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              <span className="me-3 fs-5">{room.icon}</span>
              <div>
                <div className="fw-bold" style={{fontSize: '0.9rem'}}>{room.name}</div>
                <small style={{opacity: 0.7, fontSize: '0.75rem'}}>{room.scope.toUpperCase()}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: CHAT AREA */}
      <div className="d-flex flex-column flex-grow-1" style={{ backgroundColor: 'var(--bg-body)' }}>
        {/* Header */}
        <div className="p-3 border-bottom shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h6 className="m-0 fw-bold d-flex align-items-center">
            {activeRoom.icon} <span className="ms-2">{activeRoom.name}</span>
          </h6>
        </div>

        {/* Messages */}
        <div className="flex-grow-1 p-4 overflow-auto d-flex flex-column">
          {isLoading ? (
            <div className="text-center mt-5 text-muted">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center mt-5 text-muted opacity-50">
              <p>No messages here yet. Say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={index} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                  {/* FIX: Removed 'card' and 'border-0' classes. Added 'position-relative'. */}
                  <div 
                    className="px-3 py-2 shadow-sm position-relative" 
                    style={{
                      maxWidth: '70%',
                      // Inline style now wins because there is no conflicting .card class
                      backgroundColor: isMe ? 'var(--accent-color)' : 'var(--bg-card)',
                      color: isMe ? 'white' : 'var(--text-main)',
                      borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0'
                    }}
                  >
                    {!isMe && <small className="fw-bold d-block mb-1" style={{fontSize: '0.75rem', color: 'var(--accent-color)'}}>{msg.sender_name}</small>}
                    <span style={{whiteSpace: 'pre-wrap'}}>{msg.content}</span>
                    <div className='text-end mt-1' style={{fontSize: '0.65rem', opacity: 0.7, color: isMe ? 'white' : 'var(--text-main)'}}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
          <form onSubmit={handleSend} className="input-group">
            <input 
              type="text" 
              className="form-control chat-input border-0 shadow-none" 
              placeholder={`Message ${activeRoom.name}...`} 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}
            />
            <button className="btn btn-primary rounded-circle ms-2 d-flex align-items-center justify-content-center shadow-sm" style={{width: '45px', height: '45px'}}>
              <FaArrowUp className="fs-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
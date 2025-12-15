import React, { useState, useEffect } from 'react';

const Chat = () => {
    
    const[groups, setGroups] = useState([]);
    const[isLoading, setIsLoading] = useState(true);
    const [activeGroup, setActiveGroup] = useState(null);

    // Simulate fetching groups from an API
    useEffect(() => {
        const fetchData = async () => {
            // Simulated delay - REMOVE LATER
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulated group data
            const groupData = [
                { id: 1, name: 'Gr 621', type: 'group' },
                { id: 2, name: 'FIM', type: 'faculty' },
                { id: 3, name: 'RAU', type: 'university' },
            ];
            setGroups(groupData);

            if (groupData.length > 0) {
                setActiveGroup(groupData[0]); // Set first group as active by default
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
        <div className="d-flex justify-content-center align-items-center h-100">
            <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
            </div>
        </div>
        );
}

    return (
        <div className="d-flex h-100 w-100"> 
        <div 
            className="d-flex flex-column p-3" 
            style={{ 
            width: '320px', 
            backgroundColor: 'var(--bg-card)', 
            borderRight: '1px solid var(--border-color)' 
            }}
        >
            <h4 className="mb-4 fw-bold ps-2">Messages</h4>
            
            {/* Removed 'list-group-flush' to allow rounded corners */}
            <div className="list-group"> 
            {groups.map((group) => (
                <button
                key={group.id}
                onClick={() => setActiveGroup(group)}
                /* FIX: Added 'text-start' and 'text-wrap' 
                    This forces long names like 'Informatica...' to wrap to the next line 
                */
                className={`list-group-item list-group-item-action custom-list-item p-3 text-start ${activeGroup.id === group.id ? 'active' : ''}`}
                style={{
                    backgroundColor: activeGroup.id === group.id ? 'var(--accent-color)' : 'var(--bg-body)',
                    color: activeGroup.id === group.id ? 'white' : 'var(--text-main)',
                    whiteSpace: 'normal' /* Ensures text wraps */
                }}
                >
                <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">{group.name}</span>
                </div>
                <small style={{ opacity: 0.8 }}>{group.type}</small>
                </button>
            ))}
            </div>
        </div>

        {/* RIGHT SIDE: Chat Area */}
        {/* 'flex-grow-1' makes it fill ALL remaining space */}
        <div className="d-flex flex-column flex-grow-1" style={{ backgroundColor: 'var(--bg-body)' }}>
            
            {/* Header */}
            <div className="p-3 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
            <h5 className="m-0 fw-bold">{activeGroup.name}</h5>
            </div>

            {/* Messages Container */}
            <div className="flex-grow-1 p-4 overflow-auto">
            <div className="text-center text-muted mt-5">
                <small>Start of conversation in {activeGroup.name}</small>
            </div>
            
            {/* Example Message */}
            <div className="d-flex mb-3 mt-4">
                <div className="card border-0 p-3 shadow-sm" style={{maxWidth: '70%', backgroundColor: 'var(--bg-card)'}}>
                    <strong style={{color: 'var(--accent-color)'}}>Alice</strong>
                    <p className="mb-0 mt-1">Hello! Does anyone know when the UI project is due?</p>
                </div>
            </div>
            </div>

            {/* Input Area */}
            <div className="p-3" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
            <div className="input-group">
                <input 
                type="text" 
                className="form-control chat-input" 
                placeholder="Type a message..." 
                style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
                <button className="btn btn-primary rounded-pill ms-2 px-4">Send</button>
            </div>
            </div>

        </div>
        </div>
    );
}

export default Chat;


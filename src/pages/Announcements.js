import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaPlus } from 'react-icons/fa';
import AddAnnouncementModal from '../components/AddAnnouncementModal'; // Import the new component

const Announcements = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false); // State for modal

    // Function to fetch data (we pass this to the modal so it can refresh the list)
    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const userParams = new URLSearchParams({ faculty: user.faculty });
            const response = await fetch(`/api/announcements?${userParams}`);
            const data = await response.json();

            const formattedData = data.map(post => ({
                id: post.id,
                title: post.title,
                content: post.content,
                author: post.author_name || 'Admin',
                date: new Date(post.created_at).toLocaleDateString('en-GB', { 
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false 
                }),
                priority: post.title.toLowerCase().includes('examen') ? 'High' : 'Medium'
            }));
            setPosts(formattedData);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };




    useEffect(() => {
        if (user) fetchAnnouncements();
    }, [user]);

    return (
        <div className='container page-padding position-relative' style={{ minHeight: '100vh' }}>
            <h2 className='mb-4'>📢 Campus Board</h2>
            
            <div className='row'>
                {posts.length === 0 ? (
                     <div className="text-center py-5">
                        <p className="fs-5" style={{ color: 'var(--text-muted)' }}>No announcements found.</p>
                     </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className='col-12 mb-3'>
                            <div className={`card ${post.priority === 'High' ? 'border-danger' : ''}`}>
                                <div className='card-header d-flex justify-content-between align-items-center'>
                                    <strong>{post.author}</strong>
                                    <span className='badge bg-secondary'>{post.date}</span>
                                </div>
                                <div className='card-body'>
                                    <h5 className='card-title'>{post.title}</h5>
                                    <p className='card-text'>{post.content}</p>
                                    {post.priority === 'High' && <span className='badge bg-danger'>Important</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ADMIN ONLY: Floating Action Button */}
            {user?.role === 'ADMIN' && (
                <>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                        style={{ 
                            position: 'fixed', 
                            bottom: '30px', 
                            right: '30px', 
                            width: '60px', 
                            height: '60px',
                            zIndex: 100
                        }}
                    >
                        <FaPlus size={24} color="white"/>
                    </button>

                    <AddAnnouncementModal 
                        show={showModal} 
                        handleClose={() => setShowModal(false)} 
                        refreshNews={fetchAnnouncements} 
                    />
                </>
            )}
        </div>
    );
}

export default Announcements;
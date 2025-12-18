import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);  // Debugging

    useEffect(() => {

        if(!user) return; // Safety check

        const fetchAnnouncements = async () => {
            try {
                const userParams = new URLSearchParams({
                    faculty: user.faculty,
                });
                // Hardcoding to bypass 404
                const res = await fetch(`http://localhost:5000/api/announcements?${userParams}`);

                if (!res.ok) {
                    throw new Error(`Server error YAY!: ${res.status}`);
                }

                const data = await res.json();

                // Formatting some stuff
                const formattedData = data.map(post => ({
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    author: post.author_name || 'Admin',
                    date: new Date(post.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false // 24-hour format F*** US style
                    }),

                    // Priority logic WIP?!?!?!?
                    priority: post.title.toLowerCase().includes('important') ? 'High' : 'Normal',
                }));

                setPosts(formattedData);
            } catch (err) {
                console.error('Error fetching announcements:', err);
                setError(err.message);  // Debugging
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnnouncements();
    }, [user]);

    // ERROR STATE
    if (error) {
        return (
            <div className='container py-4'>
                <h2 className='mb-4'>📢 Anunturi</h2>
                <div className='alert alert-danger' role='alert'>{error}</div>
            </div>
        )
    }

    // LOADING STATE
    if (isLoading) {
        return (<Loading />);
    }
    

    return (
        <div className='container py-4'>
            <h2 className='mb-4'>📢 Anunturi</h2>
            <div className='row'>
                {posts.length === 0 ? (
                    <p className='text-muted'>Nu exista anunturi disponibile.</p>
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
                )))}
            </div>
        </div>
    )
}

export default Announcements;
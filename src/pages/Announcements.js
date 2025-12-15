import React from 'react';

const Announcements = () => {

    // Some mock data

    const posts = [
        { id: 1, title: 'Sesiune de examene', author: 'Secretariat', date: 'Oct 12', content: 'Sesiunea de examene va avea loc in perioada 20-30 Ianuarie. Va rugam sa va pregatiti din timp.', priority: 'High' },
        { id: 2, title: 'Activitati extra-curriculare', author: 'Clubul Studentilor', date: 'Oct 10', content: 'Va invitam sa participati la activitatile extra-curriculare organizate in campus in fiecare vineri.', priority: 'Medium' },
    ];

    return (
        <div className='container py-4'>
            <h2 className='mb-4'>📢 Anunturi</h2>
            <div className='row'>
                {posts.map(post => (
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
                ))}
            </div>
        </div>
    )
}

export default Announcements;
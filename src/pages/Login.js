import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {

            // Call the backend: hello? backend?
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Successful login
            login(data.user);

            // Redirect to dashboard
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center vh-100" style={{backgroundColor: 'var(--bg-body)'}}>
            <div className="card p-4 shadow-sm" style={{maxWidth: '400px', width: '100%'}}>
                <h2 className="text-center mb-4 fw-bold" style={{color: 'var(--text-header)'}}>WELCOME BUDDY! *will change later*</h2>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 py-2">Login</button>
                </form>

                <div className="mt-3 text-center">
                    <Link to="/register" style={{color: 'var(--link-color)'}}>Don't have an account? Register here!</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { id } from "date-fns/locale";

const Register = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // For auto-login after registration
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        fullName: "",
        college: "",
        year: "",
        series: "",
        groupName: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.error || 'Registration failed');
            };

            // Auto login logic
            const newUser = {
                id: data.userId,
                username: formData.username,
                fullName: formData.fullName,
                role: data.role,
                groupName: data.groupName,
                college: formData.college
            };

            login(newUser);

            // Redirect to dashboard
            navigate('/');
        
        } catch (err) {
            setError(err.message);
        }
    };


    return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      <div className="card p-4 shadow-sm" style={{ maxWidth: '500px', width: '100%' }}>
        <h3 className="text-center mb-4 fw-bold">Create Account</h3>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Account Info */}
          <h6 className="text-muted border-bottom pb-2 mb-3">Credentials</h6>
          <div className="row">
            <div className="col-md-6 mb-3">
               <label className="form-label">Username</label>
               <input name="username" className="form-control" onChange={handleChange} required />
            </div>
            <div className="col-md-6 mb-3">
               <label className="form-label">Password :3</label>
               <input type="password" name="password" className="form-control" onChange={handleChange} required />
            </div>
          </div>
          <div className="mb-3">
             <label className="form-label">Full Name</label>
             <input name="fullName" className="form-control" onChange={handleChange} required />
          </div>

          {/* Academic Info */}
          <h6 className="text-muted border-bottom pb-2 mb-3 mt-2">Academic Info</h6>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Faculty</label>
              <select name="college" className="form-select" onChange={handleChange} value={formData.college}>
                <option value="AI">Afaceri Internaționale</option>
                <option value="DREPT">Drept</option>
                <option value="FC">Finanțe și Contabilitate</option>
                <option value="EFSK">Educație Fizică, Sport și Kinetoterapie</option>
                <option value="IM">Informatică Managerială</option>
                <option value="MM">Management-Marketing</option>
                <option value="PSE">Psihologie și Științele Educației</option>
                <option value="TMO">Turism și Managementul Ospitalității</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Academic Year</label>
              <select name="year" className="form-select" onChange={handleChange} value={formData.year}>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
               <label className="form-label">Series</label>
               <input name="series" className="form-control" placeholder="e.g. 1" onChange={handleChange} required />
            </div>
            <div className="col-md-6 mb-3">
               <label className="form-label">Group</label>
               <input name="groupName" className="form-control" placeholder="e.g. 621" onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-success w-100 py-2 mt-3">Register</button>
        </form>
        <div className="mt-3 text-center">
          <small className="text-muted">Already have an account? <Link to="/login">Login here</Link></small>
        </div>
      </div>
    </div>
  );
};

export default Register;
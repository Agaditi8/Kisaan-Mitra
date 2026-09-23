import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    kisanId: '',
    name: '',
    phone: '',
    role: 'farmer',
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegistering ? 'register' : 'login';
    const payload = isRegistering ? formData : { kisanId: formData.kisanId };

    try {
      const res = await axios.post(`${API}/auth/${endpoint}`, payload);

      if (res.data.success && res.data.user) {
        login(res.data.user);
        navigate('/dashboard', { replace: true });
      } else if (res.data.user) {
        login(res.data.user);
        navigate('/dashboard', { replace: true });
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🌾</div>
          <h2>{isRegistering ? 'Create your Kisan ID' : 'Welcome back'}</h2>
          <p>{isRegistering ? 'Join the farming network' : 'Login to manage your produce'}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Kisan ID</label>
            <input
              name="kisanId"
              type="text"
              placeholder="12-digit Aadhaar or Mobile"
              required
              value={formData.kisanId}
              onChange={handleChange}
            />
          </div>

          {isRegistering && (
            <>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Mobile Number</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="10-digit mobile"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>I am a</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="farmer">Farmer</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <p className="toggle-auth" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}>
          {isRegistering
            ? 'Already have an account? Login'
            : "New here? Create an account"}
        </p>
      </div>
    </div>
  );
}
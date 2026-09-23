import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    kisanId: '',
    name: '',
    phone: '',
    role: 'farmer'
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? 'register' : 'login';
    
    // For login, we only need kisanId
    const payload = isRegistering ? formData : { kisanId: formData.kisanId };

    try {
      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, payload);
      if (res.data.success) {
        localStorage.setItem('kisanUser', JSON.stringify(res.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2>{isRegistering ? 'Register Kisan ID' : 'Login with Kisan ID'}</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Kisan ID (Aadhaar/Mobile)" 
          required
          value={formData.kisanId}
          onChange={(e) => setFormData({...formData, kisanId: e.target.value})}
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
        />
        
        {isRegistering && (
          <>
            <input 
              type="text" 
              placeholder="Full Name" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <input 
              type="text" 
              placeholder="Mobile Number" 
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            >
              <option value="farmer">Farmer</option>
              <option value="buyer">Buyer</option>
            </select>
          </>
        )}

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#2e7d32', color: 'white', border: 'none' }}>
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>
      
      <p 
        onClick={() => setIsRegistering(!isRegistering)} 
        style={{ color: 'blue', cursor: 'pointer', marginTop: '10px', textAlign: 'center' }}
      >
        {isRegistering ? 'Already have an ID? Login' : 'New user? Register here'}
      </p>
    </div>
  );
};

export default Login;
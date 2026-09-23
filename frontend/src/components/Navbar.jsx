import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('kisanUser'));

  const handleLogout = () => {
    localStorage.removeItem('kisanUser');
    navigate('/');
  };

  return (
    <nav style={{ padding: '1rem', background: '#2e7d32', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
      <h2>Kisan Mitra 🌾</h2>
      <div>
        {user ? (
          <>
            <Link to="/dashboard" style={{ color: 'white', marginRight: '15px' }}>Dashboard</Link>
            <Link to="/list-produce" style={{ color: 'white', marginRight: '15px' }}>List Produce</Link>
            <button onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout ({user.name})</button>
          </>
        ) : (
          <span>Please Login</span>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
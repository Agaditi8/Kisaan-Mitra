import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListProduce from './pages/ListProduce';
import Navbar from './components/Navbar';

function App() {
  // Simple auth check (Replace with Context/Redux for production)
  const user = JSON.parse(localStorage.getItem('kisanUser'));

  return (
    <Router>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/list-produce" element={user ? <ListProduce /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
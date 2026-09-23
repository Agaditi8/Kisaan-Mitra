import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [myProducts, setMyProducts] = useState([]);
  const user = JSON.parse(localStorage.getItem('kisanUser'));

  useEffect(() => {
    // Fetch products (In real app, filter by farmerId)
    const fetchProducts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/products');
        // Filtering locally for demo purposes
        const mine = res.data.products.filter(p => p.farmerId?._id === user._id || p.farmerId === user._id);
        setMyProducts(mine);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, [user._id]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome, {user.name} ({user.role})</h2>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/list-produce">
          <button style={{ padding: '10px 20px', background: '#f57c00', color: 'white', border: 'none', fontSize: '16px' }}>
            + List New Produce
          </button>
        </Link>
      </div>

      <h3>Your Active Listings</h3>
      {myProducts.length === 0 ? <p>No produce listed yet.</p> : (
        <ul>
          {myProducts.map(p => (
            <li key={p._id} style={{ marginBottom: '10px', border: '1px solid #ddd', padding: '10px' }}>
              <strong>{p.cropName}</strong> - {p.quantity}kg @ ₹{p.askingPrice}/kg 
              <span style={{ marginLeft: '10px', color: p.status === 'available' ? 'green' : 'red' }}>
                ({p.status})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
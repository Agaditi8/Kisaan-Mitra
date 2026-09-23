import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API}/products`);
        const mine = (res.data.products || []).filter(
          (p) => (p.farmerId?._id || p.farmerId) === user._id
        );
        setProducts(mine);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user._id]);

  const totalValue = products.reduce(
    (sum, p) => sum + (parseFloat(p.askingPrice) * parseFloat(p.quantity) || 0),
    0
  );

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div>
          <p className="hero-eyebrow">Welcome back</p>
          <h1 className="hero-title">Hello, {user.name} 👋</h1>
          <p className="hero-subtitle">
            Manage your produce listings and connect with buyers directly.
          </p>
        </div>
        <Link to="/list-produce" className="btn-secondary btn-cta">
          <span>+</span> List New Produce
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-green">📦</div>
          <div>
            <p className="stat-label">Active Listings</p>
            <p className="stat-value">{products.filter(p => p.status === 'available').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-orange">💰</div>
          <div>
            <p className="stat-label">Est. Total Value</p>
            <p className="stat-value">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-blue">🌾</div>
          <div>
            <p className="stat-label">Crop Types</p>
            <p className="stat-value">{new Set(products.map(p => p.cropName)).size}</p>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="section-header">
        <h2>Your Produce</h2>
        <span className="badge-count">{products.length}</span>
      </div>

      {loading ? (
        <div className="loading-state">Loading your listings...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <h3>No produce listed yet</h3>
          <p>Start by adding your first harvest — buyers are waiting!</p>
          <Link to="/list-produce" className="btn-primary inline-btn">
            + List Your First Produce
          </Link>
        </div>
      ) : (
        <div className="listings-grid">
          {products.map((p) => (
            <div key={p._id} className="listing-card">
              <div className="listing-header">
                <h4>{p.cropName}</h4>
                <span className={`status-badge status-${p.status}`}>
                  {p.status}
                </span>
              </div>
              <div className="listing-body">
                <div className="listing-row">
                  <span className="label">Quantity</span>
                  <span className="value">{p.quantity} kg</span>
                </div>
                <div className="listing-row">
                  <span className="label">Price</span>
                  <span className="value">₹{p.askingPrice}/kg</span>
                </div>
                <div className="listing-row">
                  <span className="label">Grade</span>
                  <span className="value">Grade {p.qualityGrade}</span>
                </div>
              </div>
              <div className="listing-footer">
                <span>Est. ₹{(p.quantity * p.askingPrice).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
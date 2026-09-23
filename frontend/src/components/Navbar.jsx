import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🌾</span>
        <span className="brand-text">Kisan Mitra</span>
      </div>

      <div className="navbar-links">
        <Link to="/dashboard" className={isActive('/dashboard')}>
          Dashboard
        </Link>
        <Link to="/list-produce" className={isActive('/list-produce')}>
          List Produce
        </Link>
      </div>

      <div className="navbar-user">
        <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'K'}</div>
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
        </div>
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          ⏻
        </button>
      </div>
    </nav>
  );
}
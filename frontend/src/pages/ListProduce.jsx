import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VoiceAssistant from '../components/VoiceAssistant';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function ListProduce() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    qualityGrade: 'A',
    askingPrice: '',
    location: { lat: null, long: null },
  });

  const [coords, setCoords] = useState({ lat: '', long: '' });
  const [locationStatus, setLocationStatus] = useState('manual'); // 'manual' | 'detecting' | 'ok' | 'error'
  const [locationMessage, setLocationMessage] = useState('Enter your coordinates below, or click Auto-Detect.');
  const [submitting, setSubmitting] = useState(false);

  // ---- Auto-detect (user-initiated only) ----
  const tryAutoDetect = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationMessage('Your browser does not support location access. Enter manually.');
      return;
    }

    setLocationStatus('detecting');
    setLocationMessage('Detecting your location... (up to 30s)');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const long = position.coords.longitude;
        setCoords({ lat: lat.toString(), long: long.toString() });
        setFormData((prev) => ({ ...prev, location: { lat, long } }));
        setLocationStatus('ok');
        setLocationMessage(`Location captured (${lat.toFixed(4)}, ${long.toFixed(4)})`);
      },
      (error) => {
        console.warn('Auto-detect failed:', error.message);
        setLocationStatus('error');
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Permission denied. Enter coordinates manually.'
            : 'Could not detect location. Enter coordinates manually.'
        );
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  };

  // ---- Manual entry ----
  const applyManualCoords = () => {
    const lat = parseFloat(coords.lat);
    const long = parseFloat(coords.long);

    if (isNaN(lat) || isNaN(long)) {
      alert('Please enter both latitude and longitude as numbers.');
      return;
    }
    if (lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90.');
      return;
    }
    if (long < -180 || long > 180) {
      alert('Longitude must be between -180 and 180.');
      return;
    }

    setFormData((prev) => ({ ...prev, location: { lat, long } }));
    setLocationStatus('ok');
    setLocationMessage(`Location set (${lat.toFixed(4)}, ${long.toFixed(4)})`);
  };

  const handleVoiceData = (data) => {
    setFormData((prev) => ({
      ...prev,
      cropName: data.extractedData?.crop || prev.cropName,
      quantity: data.extractedData?.quantity || prev.quantity,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.location.lat || !formData.location.long) {
      alert('Please set your location first.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/products`, {
        ...formData,
        farmerId: user._id,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to list produce');
    } finally {
      setSubmitting(false);
    }
  };

  const hasLocation = !!(formData.location.lat && formData.location.long);

  const locationClass =
    locationStatus === 'ok'
      ? 'location-status ok'
      : locationStatus === 'detecting'
      ? 'location-status loading'
      : 'location-status error';

  return (
    <div className="list-produce">
      <h2>List Your Produce</h2>
      <p className="page-subtitle">
        Use voice or fill the form to list your harvest for buyers.
      </p>

      {/* Voice section */}
      <div className="voice-section">
        <h4>🎤 Voice Assistant</h4>
        <p>Speak in Hindi, Tamil, Telugu, or English — we'll auto-fill the form.</p>
        <VoiceAssistant onDataExtracted={handleVoiceData} />
      </div>

      {/* Manual form */}
      <div className="manual-section">
        <h4>Or Fill Manually</h4>
        <p>All fields marked are required to publish your listing.</p>

        <form onSubmit={handleSubmit} className="produce-form">
          <div className="input-group">
            <label>Crop Name</label>
            <input
              type="text"
              placeholder="e.g. Wheat, Rice, Tomato"
              required
              value={formData.cropName}
              onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Quantity (kg)</label>
              <input
                type="number"
                placeholder="100"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Price per kg (₹)</label>
              <input
                type="number"
                placeholder="25"
                min="1"
                required
                value={formData.askingPrice}
                onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Quality Grade</label>
            <select
              value={formData.qualityGrade}
              onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
            >
              <option value="A">Grade A — Premium</option>
              <option value="B">Grade B — Good</option>
              <option value="C">Grade C — Average</option>
            </select>
          </div>

          {/* ============ LOCATION BLOCK ============ */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Location</label>
              <button
                type="button"
                onClick={tryAutoDetect}
                disabled={locationStatus === 'detecting'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-dark, #15803d)',
                  fontWeight: 600,
                  cursor: locationStatus === 'detecting' ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {locationStatus === 'detecting' ? 'Detecting...' : '📍 Auto-Detect'}
              </button>
            </div>

            <div className="form-row" style={{ marginTop: '8px' }}>
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 28.6139)"
                value={coords.lat}
                onChange={(e) => setCoords((p) => ({ ...p, lat: e.target.value }))}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 77.2090)"
                value={coords.long}
                onChange={(e) => setCoords((p) => ({ ...p, long: e.target.value }))}
              />
            </div>

            <button
              type="button"
              onClick={applyManualCoords}
              style={{
                marginTop: '8px',
                padding: '10px 16px',
                background: 'var(--primary-tint, #f0fdf4)',
                color: 'var(--primary-dark, #15803d)',
                border: '1px solid var(--primary-soft, #dcfce7)',
                borderRadius: 'var(--radius-md, 12px)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ✓ Set This Location
            </button>

            <div className={locationClass} style={{ marginTop: '12px' }}>
              <span>
                {locationStatus === 'ok' && '📍'}
                {locationStatus === 'detecting' && '⏳'}
                {locationStatus === 'error' && '⚠️'}
                {locationStatus === 'manual' && 'ℹ️'}
              </span>
              <span style={{ flex: 1 }}>{locationMessage}</span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '8px', lineHeight: 1.5 }}>
              💡 <strong>How to find coordinates:</strong> Open{' '}
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                Google Maps
              </a>{' '}
              → find your village → right-click on it → click the two numbers at the top of the menu → paste them above.
            </p>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || !hasLocation}
          >
            {submitting
              ? 'Publishing...'
              : !hasLocation
              ? 'Set location to continue'
              : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
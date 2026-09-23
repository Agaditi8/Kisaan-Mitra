import React, { useState, useEffect } from 'react';
import VoiceAssistant from '../components/VoiceAssistant';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ListProduce = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('kisanUser'));
  
  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    qualityGrade: 'A',
    askingPrice: '',
    location: { lat: null, long: null }
  });

  // Get Location on Mount (Needed for Person 4 - Supply/Demand Matching)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              long: position.coords.longitude
            }
          }));
        },
        (error) => console.error("Location access denied", error)
      );
    }
  }, []);

  const handleVoiceData = (data) => {
    setFormData(prev => ({
      ...prev,
      cropName: data.extractedData.crop || prev.cropName,
      quantity: data.extractedData.quantity || prev.quantity,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location.lat) {
      alert("Please allow location access to list produce.");
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/products', {
        ...formData,
        farmerId: user._id
      });
      alert('Produce Listed Successfully!');
      navigate('/dashboard');
    } catch (err) {
      alert('Error listing produce');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>List Your Produce</h2>
      
      <div style={{ padding: '20px', background: '#e8f5e9', marginBottom: '20px', borderRadius: '8px' }}>
        <h4>Option 1: Use Voice (Bhashini AI)</h4>
        <p>Speak in your local language (e.g., "Mujhe 10 quintal gehu bechna hai")</p>
        <VoiceAssistant onDataExtracted={handleVoiceData} />
      </div>

      <h4>Option 2: Fill Manually</h4>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Crop Name (e.g., Wheat)" 
          required
          value={formData.cropName}
          onChange={(e) => setFormData({...formData, cropName: e.target.value})}
          style={{ padding: '8px' }}
        />
        <input 
          type="number" 
          placeholder="Quantity (kg)" 
          required
          value={formData.quantity}
          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
          style={{ padding: '8px' }}
        />
        <select 
          value={formData.qualityGrade}
          onChange={(e) => setFormData({...formData, qualityGrade: e.target.value})}
          style={{ padding: '8px' }}
        >
          <option value="A">Grade A (Premium)</option>
          <option value="B">Grade B (Good)</option>
          <option value="C">Grade C (Average)</option>
        </select>
        <input 
          type="number" 
          placeholder="Asking Price per kg (₹)" 
          required
          value={formData.askingPrice}
          onChange={(e) => setFormData({...formData, askingPrice: e.target.value})}
          style={{ padding: '8px' }}
        />
        <p style={{ fontSize: '12px', color: formData.location.lat ? 'green' : 'red' }}>
          {formData.location.lat ? `📍 Location captured (${formData.location.lat.toFixed(2)}, ${formData.location.long.toFixed(2)})` : "📍 Waiting for location..."}
        </p>
        <button type="submit" style={{ padding: '10px', background: '#2e7d32', color: 'white', border: 'none', fontSize: '16px' }}>
          Submit Listing
        </button>
      </form>
    </div>
  );
};

export default ListProduce;
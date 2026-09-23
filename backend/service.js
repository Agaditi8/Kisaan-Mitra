const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kisan_mitra')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

// Use Routes  ← ⚠️ THIS IS CRITICAL
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/voice', voiceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
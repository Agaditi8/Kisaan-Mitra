const User = require('../models/User');

// @desc    Register a new Farmer/Buyer (Kisan ID)
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { kisanId, name, phone, role, location } = req.body;

    // Check if Kisan ID already exists
    const existingUser = await User.findOne({ kisanId });
    if (existingUser) {
      return res.status(400).json({ message: 'Kisan ID already registered' });
    }

    const newUser = new User({
      kisanId,
      name,
      phone,
      role,
      location
    });

    await newUser.save();
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Login via Kisan ID (Simple Auth for MVP)
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { kisanId } = req.body;
    const user = await User.findOne({ kisanId });

    if (!user) {
      return res.status(404).json({ message: 'Kisan ID not found. Please register.' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
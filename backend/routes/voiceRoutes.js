const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processVoiceCommand } = require('../controllers/voiceController');

// Configure multer to store file in memory (buffer) instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route accepts a single file named 'audio'
router.post('/process', upload.single('audio'), processVoiceCommand);

module.exports = router;
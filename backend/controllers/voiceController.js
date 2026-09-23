const bhashiniService = require('../services/bhashiniService');

exports.processVoiceCommand = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioBuffer = req.file.buffer;
    const language = req.body.language || 'hi'; // Default Hindi

    // 1. Convert Voice to Text using Bhashini
    const textResult = await bhashiniService.speechToText(audioBuffer, language);
    
    // 2. Simple Keyword Extraction (Person 2 can replace this with NLP later)
    const extractedData = {
      crop: extractEntity(textResult, ['wheat', 'gehu', 'rice', 'chawal', 'corn', 'makka', 'onion', 'pyaz']),
      quantity: extractNumber(textResult)
    };

    // 3. Optional: Send a confirmation back as audio
    // const audioResponse = await bhashiniService.textToSpeech(`Aapne ${extractedData.quantity} ${extractedData.crop} list kiye hain`, language);

    res.json({ 
      success: true, 
      transcript: textResult,
      extractedData
    });

  } catch (error) {
    console.error("Voice Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper to extract crop names from text
function extractEntity(text, keywords) {
  const lowerText = text.toLowerCase();
  for (let word of keywords) {
    if (lowerText.includes(word)) return word;
  }
  return "";
}

// Helper to extract numbers (quantity)
function extractNumber(text) {
  const matches = text.match(/\d+/g);
  return matches ? matches[0] : ""; // Returns the first number found
}
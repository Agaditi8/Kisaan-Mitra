const axios = require('axios');

// Helper to convert Audio Buffer -> Text (ASR)
exports.speechToText = async (audioBuffer, sourceLang) => {
  try {
    // Bhashini API usually requires a pipeline. 
    // 1. Get Pipeline Config (ULCA)
    // 2. Call ASR model
    
    // This is a simplified conceptual implementation.
    const response = await axios.post(process.env.BHASHINI_ASR_URL, {
      audio: audioBuffer.toString('base64'),
      language: sourceLang // e.g., 'hi' for Hindi
    }, {
      headers: {
        'Authorization': process.env.BHASHINI_API_KEY,
        'userID': process.env.BHASHINI_USER_ID
      }
    });

    return response.data.transcript; // The text version of what farmer said
  } catch (error) {
    console.error("Bhashini STT Error:", error);
    throw new Error("Voice processing failed");
  }
};

// Helper to convert Text -> Audio (TTS)
exports.textToSpeech = async (text, targetLang) => {
  try {
    const response = await axios.post(process.env.BHASHINI_TTS_URL, {
      text: text,
      language: targetLang
    }, {
      headers: {
        'Authorization': process.env.BHASHINI_API_KEY,
        'userID': process.env.BHASHINI_USER_ID
      }
    });

    return response.data.audio_base64; // Return audio to play to user
  } catch (error) {
    console.error("Bhashini TTS Error:", error);
    throw new Error("Audio generation failed");
  }
};
import React, { useState, useRef } from 'react';
import axios from 'axios';

const VoiceAssistant = ({ onDataExtracted }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendToBackend = async (audioBlob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', 'hi'); // Hardcoded for now

    try {
      // Send to your Node backend
      const res = await axios.post('http://localhost:5000/api/voice/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Pass the result up to the parent form
      if (res.data.success) {
        onDataExtracted(res.data);
      }
    } catch (error) {
      alert("Error processing voice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voice-assistant">
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className={`mic-btn ${isRecording ? 'recording' : ''}`}
      >
        {isRecording ? "🛑 Stop" : "🎤 Speak to List Produce"}
      </button>
      {loading && <p>Processing Bhashini AI...</p>}
    </div>
  );
};

export default VoiceAssistant;
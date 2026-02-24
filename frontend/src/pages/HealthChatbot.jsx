import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { healthAPI } from '../services/api';
import { useAuthStore } from '../store/store';

export default function HealthChatbot() {
  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const patientId = routePatientId || user?.id || user?._id || user?.user_id;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const [suggestedSpecialty, setSuggestedSpecialty] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI Health Assistant powered by Gemini. 👋\n\nTell me what\'s going on — what happened, how you feel, or what\'s worrying you. I\'ll ask follow-up questions to understand your situation better and suggest the right specialist for you.\n\nHow can I help you today?',
      timestamp: new Date()
    }]);
  }, []);

  if (!patientId || String(patientId) === 'undefined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-lg font-semibold">Please log in to use the AI Assistant.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
  
    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSuggestedSpecialty(null);
    setLoading(true);
  
    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
  
      const response = await healthAPI.sendChatMessage(
        patientId,
        userMessage.content,
        history
      );
  
      const data = response.data;
  
      const assistantMessage = {
        role: 'assistant',
        content: data.assistant_response,
        timestamp: new Date(),
        disclaimer: data.disclaimer
      };
  
      setMessages(prev => [...prev, assistantMessage]);
  
      if (data.suggested_specialty) {
        setSuggestedSpecialty(data.suggested_specialty);
      }
  
    } catch (err) {
      console.error('Error sending message:', err);
  
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    'I have a headache that won\'t go away — what could it be?',
    'What exercises are safe for back pain?',
    'What diet changes help lower blood pressure?',
    'I feel dizzy after taking my medication — is that normal?',
    'I can\'t sleep well — what can I do?',
    'I\'m very stressed and anxious lately.',
    'My heart beats fast sometimes — should I worry?',
    'My blood sugar is high — what should I do?',
    'I have joint pain and stiffness in the morning.',
    'I feel short of breath during light activity.',
  ];

  const SPECIALTIES = [
    { id: 'neurologist', name: 'Neurologist', icon: '🧠', desc: 'Brain, nerves, movement disorders' },
    { id: 'physiotherapist', name: 'Physiotherapist', icon: '🦵', desc: 'Movement, rehabilitation, pain' },
    { id: 'cardiologist', name: 'Cardiologist', icon: '❤️', desc: 'Heart and circulation' },
    { id: 'therapist', name: 'Therapist', icon: '💬', desc: 'Mental health, counselling' },
    { id: 'psychiatrist', name: 'Psychiatrist', icon: '🧬', desc: 'Mental health, medication' },
    { id: 'dermatologist', name: 'Dermatologist', icon: '🩹', desc: 'Skin conditions' },
    { id: 'general', name: 'General Practitioner', icon: '👨‍⚕️', desc: 'General health concerns' },
    { id: 'orthopedist', name: 'Orthopedist', icon: '🦴', desc: 'Bones, joints, muscles' },
    { id: 'pulmonologist', name: 'Pulmonologist', icon: '🫁', desc: 'Lungs, breathing issues' },
    { id: 'gastroenterologist', name: 'Gastroenterologist', icon: '🫃', desc: 'Digestive system' },
    { id: 'endocrinologist', name: 'Endocrinologist', icon: '⚖️', desc: 'Hormones, diabetes' },
  ];

  const matchSpecialty = (name) => {
    if (!name || !suggestedSpecialty) return false;
    return name.toLowerCase().replace(/\s+/g, '').includes(suggestedSpecialty.toLowerCase().replace(/\s+/g, '')) ||
      suggestedSpecialty.toLowerCase().includes(name.toLowerCase());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4 flex flex-col"
    >
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white">🤖 AI Health Assistant</h1>
              <p className="text-blue-100">Get evidence-based health insights and suggestions</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              ← Back
            </motion.button>
          </div>
        </motion.div>

        {/* Chat Container */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-slate-600 font-semibold">Start a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-bl-2xl'
                          : 'bg-slate-100 text-slate-900 rounded-br-2xl'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.disclaimer && (
                        <p className="text-xs mt-2 opacity-75 italic">⚠️ {msg.disclaimer}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-slate-100 px-4 py-3 rounded-lg rounded-br-2xl">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-4 border-t border-slate-200"
            >
              <p className="text-xs text-slate-600 font-semibold mb-3">Suggested Questions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInputValue(q)}
                    className="text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200 transition"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Show only the one suggested specialist card when AI recommends a doctor */}
          {suggestedSpecialty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-4 border-t border-slate-200 bg-blue-50"
            >
              <p className="text-sm font-semibold text-blue-800 mb-2">Based on what you shared, consider talking to:</p>
              {(() => {
                const s = SPECIALTIES.find(sp => matchSpecialty(sp.name)) || {
                  name: suggestedSpecialty,
                  icon: '👨‍⚕️',
                  desc: 'Specialist can help with your concern. Book an appointment to discuss.'
                };
                return (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate('/appointments')}
                    className="w-full text-left p-4 rounded-xl border-2 border-blue-400 bg-white shadow-md flex items-center gap-4 hover:border-blue-600 transition"
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900">{s.name}</p>
                      <p className="text-sm text-slate-600">{s.desc}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">Book appointment →</span>
                  </motion.button>
                );
              })()}
            </motion.div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your health..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={loading || !inputValue.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </motion.button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 This AI assistant provides information for educational purposes. Always consult with healthcare professionals for medical decisions.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

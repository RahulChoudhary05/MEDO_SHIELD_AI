import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import api from '../services/api';
import { getSuggestions, insertSuggestion } from '../services/chatSuggestions';

// ── Small helper to format timestamps ──
const fmtTime = (ts) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const fmtDate = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yes = new Date(); yes.setDate(yes.getDate() - 1);
    if (d.toDateString() === yes.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

// ── Voice recorder hook ──
function useVoiceRecorder(onDataReady) {
  const mr = useRef(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration]   = useState(0);
  const timer = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      mr.current = new MediaRecorder(stream);
      mr.current.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onDataReady(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.current.start();
      setRecording(true);
      setDuration(0);
      timer.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) { 
      console.error('Microphone access error:', err);
      alert('Microphone access denied. Please enable it in your browser settings.'); 
    }
  };

  const stop = () => {
    mr.current?.stop();
    clearInterval(timer.current);
    setRecording(false);
    setDuration(0);
  };

  useEffect(() => () => clearInterval(timer.current), []);
  return { recording, duration, start, stop };
}

// ─────────────────────────────────────────────────────────
export default function DoctorPatientChat() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [patientInfo, setPatientInfo] = useState(null);
  const [error, setError]         = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  const myId   = user?.id || user?._id || user?.user_id;
  const isDoc  = role === 'doctor';

  // Voice recorder
  const voice = useVoiceRecorder((blob) => sendVoiceNote(blob));

  // ── Load conversation ─────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get(`/health/chat/${patientId}/messages`);
      setMessages(res.data.messages || []);
    } catch (e) {
      if (e.response?.status !== 404) setError('Failed to load messages.');
    }
  }, [patientId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isDoc) {
          const res = await api.get(`/doctors/patients`);
          const p = (res.data || []).find(pt => (pt.id || pt._id) === patientId);
          setPatientInfo(p);
        }
        await loadMessages();
      } finally { setLoading(false); }
    };
    init();
  }, [patientId, isDoc, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10s
  useEffect(() => {
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0 && !sending) {
      setSuggestionsLoading(true);
      getSuggestions(messages, 'doctor')
        .then(sug => setSuggestions(sug || []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }
  }, [messages, sending]);

  // ── Send text ─────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const temp = { _id: `tmp-${Date.now()}`, sender_role: role, sender_id: myId, content: text, msg_type: 'text', created_at: new Date().toISOString(), pending: true };
    setMessages(prev => [...prev, temp]);
    setInput('');
    try {
      await api.post(`/health/chat/${patientId}/send`, { content: text, msg_type: 'text' });
      await loadMessages();
    } catch { setError('Failed to send message. Please try again.'); }
    finally { setSending(false); }
  };

  // ── Send voice note ───────────────────────────────────
  const sendVoiceNote = async (blob) => {
    const fd = new FormData();
    fd.append('file', blob, 'voice-note.webm');
    fd.append('msg_type', 'voice');
    try {
      await api.post(`/health/chat/${patientId}/send-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadMessages();
    } catch { setError('Failed to send voice note.'); }
  };

  // ── Send file attachment ──────────────────────────────
  const sendFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('msg_type', 'file');
    try {
      await api.post(`/health/chat/${patientId}/send-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadMessages();
    } catch { setError('Failed to send file.'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Message bubble ────────────────────────────────────
  const MessageBubble = ({ msg }) => {
    const isMine = msg.sender_role === role || msg.sender_id === myId;
    const isDoc_ = msg.sender_role === 'doctor';

    return (
      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mb-1 ${
          isDoc_ ? 'bg-primary' : 'bg-secondary'
        }`}>
          {isDoc_ ? 'Dr' : 'P'}
        </div>

        {/* Bubble */}
        <div className={`max-w-xs sm:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          {msg.msg_type === 'voice' ? (
            <div className={`px-4 py-3 rounded-2xl flex items-center gap-3 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              </div>
              {msg.media_url ? (
                <audio controls className="h-8 w-36" src={msg.media_url} />
              ) : (
                <span className="text-sm">Voice Note</span>
              )}
            </div>
          ) : msg.msg_type === 'file' ? (
            <div className={`px-4 py-3 rounded-2xl flex items-center gap-3 ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {msg.media_url ? (
                <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-sm underline">{msg.file_name || 'Attachment'}</a>
              ) : (
                <span className="text-sm">{msg.file_name || 'File'}</span>
              )}
            </div>
          ) : (
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isMine
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
            } ${msg.pending ? 'opacity-60' : ''}`}>
              {msg.content}
            </div>
          )}
          <span className="text-xs text-slate-400 px-1">{fmtDate(msg.created_at)} {fmtTime(msg.created_at)}</span>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Loading conversation...</p>
      </div>
    </div>
  );

  const chatPartner = isDoc
    ? (patientInfo ? `${patientInfo.first_name || ''} ${patientInfo.last_name || ''}`.trim() || patientInfo.email : 'Patient')
    : 'Your Doctor';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Chat Header ── */}
      <div className="px-4 py-4 flex items-center gap-3 shadow-lg sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)' }}>
        <button onClick={() => navigate(isDoc ? '/doctor-dashboard' : '/dashboard')}
          className="text-white/70 hover:text-white flex-shrink-0 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${isDoc ? 'bg-white/20' : 'bg-secondary'}`}>
          {isDoc ? 'P' : 'Dr'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{chatPartner}</p>
          <p className="text-white/60 text-xs">
            {isDoc ? 'Patient · MEDO SHIELD AI' : 'Your assigned doctor · Secure channel'}
          </p>
        </div>
        <button onClick={loadMessages} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {error && <div className="alert-error text-sm mb-4">{error}</div>}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-4xl mb-4">💬</div>
            <h3 className="font-bold text-slate-700 text-lg">Start a conversation</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs">
              {isDoc
                ? 'Send a message to your patient. You can share text, voice notes, and files.'
                : 'Send a message to your doctor. You can share symptoms, questions, or files.'}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={msg._id || i} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 sticky bottom-0 shadow-up">
        <div className="max-w-3xl mx-auto">
          {/* AI Suggestions */}
          {suggestions.length > 0 && !input.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 pb-3 border-b border-slate-100"
            >
              <p className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1">
                <span>💡 Suggested replies:</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <motion.button
                    key={suggestion.id}
                    onClick={() => setInput(insertSuggestion(input, suggestion.text))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-full hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-1"
                  >
                    <span>{suggestion.icon}</span>
                    <span className="line-clamp-1">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
          {/* Voice recording indicator */}
          <AnimatePresence>
            {voice.recording && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span className="text-red-700 text-sm font-semibold">Recording… {voice.duration}s</span>
                <button onClick={voice.stop} className="ml-auto text-xs px-3 py-1 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600">
                  Stop & Send
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            {/* Attach file – doctors only (for sharing charts/reports) */}
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ''; }} />
            {isDoc && (
              <button onClick={() => fileRef.current?.click()}
                title="Share chart or file with patient"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-secondary hover:bg-secondary/10 transition-colors flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            )}

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={isDoc ? 'Write to patient…' : 'Write to your doctor…'}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent max-h-32 overflow-y-auto"
                style={{ '--tw-ring-color': 'rgba(13,148,136,0.35)' }}
              />
            </div>

            {/* Voice note button */}
            <button
              onClick={voice.recording ? voice.stop : voice.start}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                voice.recording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-secondary hover:bg-secondary/10'
              }`}
            >
              <svg className="w-5 h-5" fill={voice.recording ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={voice.recording ? 0 : 2}
                  d={voice.recording
                    ? "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  } />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 btn-teal disabled:opacity-40 disabled:cursor-not-allowed px-0 py-0"
              style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
            >
              {sending
                ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              }
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

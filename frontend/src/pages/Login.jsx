import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { authAPI } from '../services/api';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser, setRole } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      setToken(response.data.access_token);
      setRole('patient');
      const userResponse = await authAPI.getCurrentPatient();
      setUser(userResponse.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <path d="M16 2L4 7v9c0 7.18 5.14 13.9 12 15.48C22.86 29.9 28 23.18 28 16V7L16 2z" fill="white" fillOpacity="0.9"/>
              <path d="M11 16.5l3 3 7-7" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">MEDO SHIELD AI</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your health journey,<br/>digitally empowered.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Upload medical reports, get AI-powered summaries, connect with expert doctors — all in one secure portal.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: 'AI-Powered Report Analysis', desc: 'Google Gemini extracts and explains your lab results' },
              { label: 'Secure & Private', desc: 'JWT authentication, encrypted data storage' },
              { label: 'Doctor Collaboration', desc: 'Async expert reviews, prescriptions, and guidance' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.label}</p>
                  <p className="text-white/60 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-sm">&copy; 2026 MEDO SHIELD AI. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
                <path d="M16 2L4 7v9c0 7.18 5.14 13.9 12 15.48C22.86 29.9 28 23.18 28 16V7L16 2z" fill="white"/>
                <path d="M11 16.5l3 3 7-7" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-primary text-xl">MEDO SHIELD AI</span>
          </div>

          <div className="medo-card p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">Patient Login</h1>
              <p className="text-slate-500 text-sm mt-1">Welcome back! Enter your credentials to access your health portal.</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="alert-error mb-6 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="medo-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="medo-input pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing In...
                  </span>
                ) : 'Sign In'}
              </motion.button>
            </form>

            <div className="mt-6 section-divider" />

            <div className="space-y-3">
              <p className="text-center text-sm text-slate-500">
                Don&rsquo;t have an account?{' '}
                <Link to="/register" className="text-secondary font-semibold hover:underline">Create free account</Link>
              </p>
              <p className="text-center text-sm text-slate-500">
                Are you a doctor?{' '}
                <Link to="/doctor-login" className="text-secondary font-semibold hover:underline">Doctor login</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

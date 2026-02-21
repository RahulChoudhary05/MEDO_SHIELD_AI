import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { authAPI } from '../services/api';
import { motion } from 'framer-motion';

export default function Register() {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '',
    password: '', date_of_birth: '', gender: ''
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser, setRole } = useAuthStore();

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authAPI.register(formData);
      if (response.data?.access_token) {
        setToken(response.data.access_token);
        setRole('patient');
        const userResponse = await authAPI.getCurrentPatient();
        setUser(userResponse.data);
        navigate('/dashboard');
      } else {
        setError('Unexpected response. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pwdStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
    if (p.length < 8) return { label: 'Fair', color: 'bg-amber-500', width: '50%' };
    if (p.length < 12) return { label: 'Good', color: 'bg-blue-500', width: '75%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };
  const strength = pwdStrength();

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12">
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
            Start your health<br/>journey today.
          </h2>
          <p className="text-white/70 leading-relaxed max-w-xs">
            Create your free patient account to upload reports, get AI insights, and connect with expert doctors.
          </p>
          <div className="mt-8 space-y-3">
            {['Free to create', 'Secure & Private', 'Real AI analysis', 'Doctor collaboration'].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-white/70 text-sm">
                <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-sm">&copy; 2026 MEDO SHIELD AI</p>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
                <path d="M16 2L4 7v9c0 7.18 5.14 13.9 12 15.48C22.86 29.9 28 23.18 28 16V7L16 2z" fill="white"/>
                <path d="M11 16.5l3 3 7-7" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-primary text-xl">MEDO SHIELD AI</span>
          </div>

          <div className="medo-card p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Create Patient Account</h1>
              <p className="text-slate-500 text-sm mt-1">Join MEDO SHIELD AI — free, secure, and AI-powered.</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="alert-error mb-5 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange}
                    required className="medo-input" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange}
                    required className="medo-input" placeholder="Doe" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  required className="medo-input" placeholder="you@example.com" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password * <span className="text-slate-400 font-normal">(min 8 chars)</span></label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    required className="medo-input pr-12" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
                {strength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Password strength</span>
                      <span className={`text-xs font-semibold ${
                        strength.label === 'Weak' ? 'text-red-500' :
                        strength.label === 'Fair' ? 'text-amber-500' :
                        strength.label === 'Good' ? 'text-blue-500' : 'text-emerald-500'
                      }`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                  </div>
                )}
              </div>

              {/* DOB + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                    className="medo-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="medo-input">
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-base mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating Account...
                  </span>
                ) : 'Create Account'}
              </motion.button>
            </form>

            <div className="section-divider mt-6" />
            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-secondary font-semibold hover:underline">Sign in here</Link>
            </p>
            <p className="text-center text-sm text-slate-500 mt-2">
              Are you a doctor?{' '}
              <Link to="/doctor-register" className="text-secondary font-semibold hover:underline">Doctor registration</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

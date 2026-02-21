import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doctorAuthAPI } from '../services/api';
import { useAuthStore } from '../store/store';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser, setRole } = useAuthStore();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await doctorAuthAPI.login({ email, password });
      setToken(response.data.access_token);
      setRole('doctor');

      const profile = await doctorAuthAPI.getProfile();
      setUser(profile.data);
      navigate('/doctor-dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Doctor Sign In</h1>
            <p className="text-slate-600">Access your clinical dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="doctor@clinic.com"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Need an account?{' '}
              <Link to="/doctor-register" className="text-blue-600 font-bold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

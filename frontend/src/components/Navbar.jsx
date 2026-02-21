import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { healthAPI, doctorAPI } from '../services/api';

const ShieldIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
    <path d="M16 2L4 7v9c0 7.18 5.14 13.9 12 15.48C22.86 29.9 28 23.18 28 16V7L16 2z"
      fill="url(#shieldGrad)" />
    <path d="M11 16.5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="shieldGrad" x1="4" y1="2" x2="28" y2="31" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0d9488"/>
        <stop offset="100%" stopColor="#0a2342"/>
      </linearGradient>
    </defs>
  </svg>
);

const NAV_PATIENT = [
  { to: '/analysis',     label: 'Upload' },
  { to: '/health-history', label: 'History' },
  { to: '/patient-chat', label: '💬 Chat' },
];
const NAV_DOCTOR = [
  { to: '/doctor-dashboard', label: 'Portal' },
];

export default function Navbar() {
  const { user, role, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const patientId = user?.id || user?._id || user?.user_id;
  const doctorId = user?.id || user?._id || user?.user_id;

  // Load notifications periodically
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        if (role === 'patient' && patientId) {
          const res = await healthAPI.getNotifications(patientId);
          const items = res.data.notifications || [];
          const unread = items.filter(n => !n.is_read).length;
          setUnreadCount(unread);
          setNotifications(items.map(n => ({
            id: n._id,
            type: n.category,
            text: n.message || n.title,
            icon: n.category === 'chat' ? '💬' : '📅'
          })));
        } else if (role === 'doctor' && doctorId) {
          const res = await doctorAPI.getNotifications();
          const items = res.data.notifications || [];
          const unread = items.filter(n => !n.is_read).length;
          setUnreadCount(unread);
          setNotifications(items.map(n => ({
            id: n._id,
            type: n.category,
            text: n.message || n.title,
            icon: n.category === 'chat' ? '💬' : '📅'
          })));
        }
      } catch (error) {
        console.log('Notification loading not available yet');
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [user, role, patientId, doctorId]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMenuOpen(false);
  };

  const handleNotificationClick = async () => {
    setShowNotifications(false);
    try {
      if (role === 'patient' && patientId) {
        await healthAPI.markNotificationsRead(patientId);
      }
      if (role === 'doctor') {
        await doctorAPI.markNotificationsRead();
      }
      setUnreadCount(0);
    } catch {}
    if (role === 'patient') {
      navigate('/patient-chat');
    } else if (role === 'doctor') {
      navigate('/doctor-dashboard');
    }
  };

  const navLinks = role === 'doctor' ? NAV_DOCTOR : NAV_PATIENT;
  const extraLinks = role === 'patient' && patientId
    ? [
        { to: `/medications/${patientId}`,     label: 'Medications' },
        { to: `/fitness-tracking/${patientId}`, label: '📱 Fitness' },
        { to: `/health-chatbot/${patientId}`,  label: 'AI Assistant' },
        { to: '/appointments', label: '📅 Appointments' },
      ]
    : [];
  const allLinks = [...navLinks, ...extraLinks];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-50 bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setMenuOpen(false)}
          >
            <div className="flex-shrink-0">
              <ShieldIcon />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg leading-none tracking-tight">MEDO</span>
              <span className="text-secondary font-bold text-lg leading-none"> SHIELD</span>
              <span className="text-white/70 text-xs font-medium ml-1 hidden md:inline">AI</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {user && allLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3 relative">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Notifications"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && notifications.length > 0 && (
                    <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <span>🔔 Notifications</span>
                          <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                            {unreadCount} new
                          </span>
                        </h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map(notif => (
                          <button
                            key={notif.id}
                            onClick={handleNotificationClick}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                          >
                            <div className="flex gap-3">
                              <span className="text-2xl">{notif.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{notif.text}</p>
                                <p className="text-xs text-gray-500 mt-1">Click to view</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {unreadCount === 0 && showNotifications && (
                    <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 text-center">
                      <p className="text-gray-500 text-sm">✓ No new notifications</p>
                    </div>
                  )}
                </div>

                {/* User badge */}
                <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {(user.first_name || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white/90 font-medium max-w-[120px] truncate">
                    {role === 'doctor'
                      ? `Dr. ${user.last_name || user.email}`
                      : (user.first_name || user.email)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    role === 'doctor' ? 'bg-secondary/30 text-secondary' : 'bg-accent/20 text-emerald-300'
                  }`}>
                    {role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login"        className="text-white/80 hover:text-white text-sm font-medium px-3 py-2 transition-colors">Patient Login</Link>
                <Link to="/doctor-login" className="text-white/80 hover:text-white text-sm font-medium px-3 py-2 transition-colors">Doctor Login</Link>
                <Link to="/register"     className="px-4 py-2 rounded-lg bg-secondary hover:bg-teal-500 text-white text-sm font-semibold transition-all duration-200">Get Started</Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-primary border-t border-white/10 px-4 py-4 space-y-1 animate-slide-down">
          {user ? (
            <>
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {(user.first_name || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {role === 'doctor' ? `Dr. ${user.last_name || ''}` : (user.first_name || user.email)}
                  </p>
                  <p className="text-white/50 text-xs capitalize">{role}</p>
                </div>
              </div>
              {allLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all text-left"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"        onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-sm font-medium">Patient Login</Link>
              <Link to="/doctor-login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-sm font-medium">Doctor Login</Link>
              <Link to="/register"     onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl bg-secondary text-white text-sm font-semibold">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

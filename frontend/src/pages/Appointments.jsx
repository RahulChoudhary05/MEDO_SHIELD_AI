import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { doctorAPI, patientAPI } from '../services/api';

const Appointments = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'patient';
  const navigate = useNavigate();

  // States
  const [activeTab, setActiveTab] = useState('browse'); // browse, appointments
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    preferredDate: '',
    preferredTime: '',
    meetingMode: 'video_call', // video_call, google_meet, offline
    message: '',
  });
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load appointments on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (role === 'patient') {
          const [docRes, reqRes] = await Promise.all([
            doctorAPI.getDirectory(),
            patientAPI.getAppointmentRequests(),
          ]);
          setDoctors(docRes.data.doctors || []);
          setAppointments(reqRes.data.requests || []);
        } else if (role === 'doctor') {
          const reqRes = await doctorAPI.getAppointmentRequests();
          setAppointments(reqRes.data.requests || []);
        }
      } catch (err) {
        setError('Failed to load appointment data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [role]);

  // Filter doctors by specialty
  const filteredDoctors = specialtyFilter === 'all'
    ? doctors
    : doctors.filter(doc => doc.specialty === specialtyFilter);

  const specialties = ['all', ...new Set(doctors.map(doc => doc.specialty))];

  // Handle appointment request
  const handleRequestAppointment = async () => {
    if (!requestFormData.preferredDate || !requestFormData.preferredTime) {
      setError('Please select date and time');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await doctorAPI.createAppointmentRequest({
        doctorId: selectedDoctor.id,
        preferredDate: requestFormData.preferredDate,
        preferredTime: requestFormData.preferredTime,
        meetingMode: requestFormData.meetingMode,
        message: requestFormData.message,
      });

      const reqRes = await patientAPI.getAppointmentRequests();
      setAppointments(reqRes.data.requests || []);
      setShowRequestForm(false);
      setSelectedDoctor(null);
      setRequestFormData({
        preferredDate: '',
        preferredTime: '',
        meetingMode: 'video_call',
        message: '',
      });

    } catch (err) {
      setError('Failed to create appointment request');
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment acceptance (doctor only)
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      await doctorAPI.acceptAppointmentRequest(appointmentId);
      const reqRes = await doctorAPI.getAppointmentRequests();
      setAppointments(reqRes.data.requests || []);
    } catch (err) {
      setError('Failed to accept appointment');
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment rejection (doctor only)
  const handleRejectAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      await doctorAPI.rejectAppointmentRequest(appointmentId);
      const reqRes = await doctorAPI.getAppointmentRequests();
      setAppointments(reqRes.data.requests || []);
    } catch (err) {
      setError('Failed to reject appointment');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📅 Appointments</h1>
          <p className="text-gray-600">
            {role === 'patient'
              ? 'Book appointments with specialists and manage your meetings'
              : 'Review and manage appointment requests from patients'}
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'browse'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300'
            }`}
          >
            🔍 {role === 'patient' ? 'Browse Doctors' : 'Appointment Requests'}
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'appointments'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300'
            }`}
          >
            📌 My Appointments ({appointments.length})
          </button>
        </div>

        {/* Browse Doctors Tab (Patient View) */}
        {activeTab === 'browse' && role === 'patient' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Specialty Filter */}
            <div className="mb-6 flex gap-2 flex-wrap">
              {specialties.map(specialty => (
                <button
                  key={specialty}
                  onClick={() => setSpecialtyFilter(specialty)}
                  className={`px-4 py-2 rounded-full font-medium transition-all capitalize ${
                    specialtyFilter === specialty
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  {specialty === 'all' ? '👥 All Specialties' : specialty}
                </button>
              ))}
            </div>

            {/* Doctor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-5xl">{doctor.image || '🩺'}</span>
                      <div>
                        <h3 className="text-xl font-bold">{doctor.name}</h3>
                        <p className="text-blue-100">{doctor.specialty}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-600 mb-4 text-sm">{doctor.bio}</p>

                    {/* Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Experience:</span>
                        <span className="font-semibold text-gray-900">{doctor.experience || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rating:</span>
                        <span className="font-semibold text-yellow-600">⭐ {doctor.rating || 4.6}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fee:</span>
                        <span className="font-semibold text-gray-900">₹{doctor.appointment_fee || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-semibold ${doctor.available ? 'text-green-600' : 'text-red-600'}`}>
                          {doctor.available ? '✓ Available' : '⏱ Busy'}
                        </span>
                      </div>
                      {doctor.nextAvailable && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Next Available:</span>
                          <span className="font-semibold text-blue-600">{doctor.nextAvailable}</span>
                        </div>
                      )}
                    </div>

                    {/* Request Button */}
                    <button
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setShowRequestForm(true);
                      }}
                      disabled={!doctor.available}
                      className={`w-full py-2 rounded-lg font-semibold transition-all ${
                        doctor.available
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {doctor.available ? '📅 Request Appointment' : 'Not Available'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Appointment Requests Tab (Doctor View) */}
        {activeTab === 'browse' && role === 'doctor' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-4">
              {appointments.filter(apt => apt.status === 'pending').length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500 text-lg">No pending appointment requests</p>
                </div>
              ) : (
                appointments
                  .filter(apt => apt.status === 'pending')
                  .map((appointment, index) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Appointment Request - {appointment.specialty}
                          </h3>
                          <p className="text-gray-600 mt-1">Patient's Message: {appointment.message}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Preferred Date:</span>
                          <p className="font-semibold text-gray-900">{appointment.preferred_date || appointment.appointmentDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Preferred Time:</span>
                          <p className="font-semibold text-gray-900">{appointment.preferred_time || appointment.appointmentTime}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Meeting Mode:</span>
                          <p className="font-semibold text-gray-900 capitalize">{(appointment.meeting_mode || appointment.meetingMode || '').replace('_', ' ')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Requested on:</span>
                          <p className="font-semibold text-gray-900">{appointment.created_at || appointment.createdAt}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAcceptAppointment(appointment.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => handleRejectAppointment(appointment.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
          </motion.div>
        )}

        {/* My Appointments Tab */}
        {activeTab === 'appointments' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500 text-lg">No appointments scheduled</p>
                </div>
              ) : (
                appointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {(appointment.doctor_name || appointment.doctorName)} - {appointment.specialty}
                        </h3>
                        {appointment.message && (
                          <p className="text-gray-600 mt-1 text-sm">Note: {appointment.message}</p>
                        )}
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(appointment.status)}`}>
                        {appointment.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-gray-500 text-sm">Date</span>
                        <p className="font-bold text-gray-900">📅 {appointment.preferred_date || appointment.appointmentDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Time</span>
                        <p className="font-bold text-gray-900">🕐 {appointment.preferred_time || appointment.appointmentTime}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Fee</span>
                        <p className="font-bold text-gray-900">₹ {appointment.appointment_fee || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Meeting Mode</span>
                        <p className="font-bold text-gray-900 capitalize">
                          {(appointment.meeting_mode || appointment.meetingMode) === 'video_call' && '📹'}
                          {(appointment.meeting_mode || appointment.meetingMode) === 'google_meet' && '👥'}
                          {(appointment.meeting_mode || appointment.meetingMode) === 'offline' && '🏢'}
                          {' '}{(appointment.meeting_mode || appointment.meetingMode || '').replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Status</span>
                        <p className="font-bold text-gray-900">
                          {appointment.status === 'pending' && '⏳'}
                          {appointment.status === 'accepted' && '✅'}
                          {appointment.status === 'rejected' && '❌'}
                          {appointment.status === 'completed' && '✓'}
                        </p>
                      </div>
                    </div>

                    {/* Meeting Link for Google Meet */}
                    {appointment.status === 'accepted' && appointment.meetingMode === 'google_meet' && appointment.meetLink && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700 mb-2">Meeting Link:</p>
                        <a
                          href={appointment.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-semibold break-all"
                        >
                          {appointment.meetLink}
                        </a>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {appointment.status === 'accepted' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate(role === 'patient' ? '/patient-chat' : `/chat/${appointment.patient_id || ''}`)}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          💬 Go to Chat
                        </button>
                        {appointment.meetingMode === 'video_call' && (
                          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-all">
                            📹 Start Call
                          </button>
                        )}
                      </div>
                    )}

                    {appointment.status === 'pending' && role === 'patient' && (
                      <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                        ⏳ Waiting for doctor to respond to your request
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Request Appointment Modal */}
        <AnimatePresence>
          {showRequestForm && selectedDoctor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Request Appointment
                </h2>
                <p className="text-gray-600 mb-6">
                  with {selectedDoctor.name} ({selectedDoctor.specialty})
                </p>
                <p className="text-sm text-gray-500 mb-6">Fee: ₹{selectedDoctor.appointment_fee || 0}</p>

                <div className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={requestFormData.preferredDate}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          preferredDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Time Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={requestFormData.preferredTime}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          preferredTime: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Meeting Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Meeting Mode
                    </label>
                    <select
                      value={requestFormData.meetingMode}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          meetingMode: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="video_call">📹 Video Call</option>
                      <option value="google_meet">👥 Google Meet</option>
                      <option value="offline">🏢 In-Person</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={requestFormData.message}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          message: e.target.value,
                        })
                      }
                      placeholder="Describe your health concern or reason for appointment"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRequestForm(false);
                      setSelectedDoctor(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestAppointment}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? '⏳ Requesting...' : '✓ Request Appointment'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Appointments;

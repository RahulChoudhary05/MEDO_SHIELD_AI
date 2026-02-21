import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { doctorAuthAPI, doctorAPI, healthAPI } from '../services/api';

const StatCard = ({ title, value, icon, color }) => (
  <div className="medo-card p-5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${color}`}>{icon}</div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-sm text-slate-500 mt-0.5">{title}</p>
  </div>
);

export default function DoctorDashboard() {
  const [doctor, setDoctor]           = useState(null);
  const [patients, setPatients]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [alerts, setAlerts]           = useState([]);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignStatus, setAssignStatus] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [search, setSearch]           = useState('');
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [feeInput, setFeeInput] = useState('');
  const [feeStatus, setFeeStatus] = useState('');
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, patRes, reqRes] = await Promise.allSettled([
        doctorAuthAPI.getProfile(),
        doctorAPI.getPatients(),
        doctorAPI.getAppointmentRequests(),
      ]);
      if (docRes.status === 'fulfilled') {
        setDoctor(docRes.value.data);
        setFeeInput(docRes.value.data?.appointment_fee ?? '');
      }
      if (patRes.status === 'fulfilled') setPatients(patRes.value.data || []);
      if (reqRes.status === 'fulfilled') setAppointmentRequests(reqRes.value.data.requests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadAlerts = async (pid) => {
    try {
      const res = await doctorAPI.getHighRiskAlerts(pid);
      setAlerts(res.data.alerts || []);
    } catch { setAlerts([]); }
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    const pid = p.id || p._id;
    setAlerts([]);
    loadAlerts(pid);
    setReportStatus('');
  };

  const handleAssign = async () => {
    if (!assignEmail.trim()) { setAssignStatus('Enter a patient email.'); return; }
    setAssignStatus('Assigning…');
    try {
      await doctorAPI.assignPatientByEmail(assignEmail.trim());
      setAssignStatus('✓ Patient assigned successfully.');
      setAssignEmail('');
      loadData();
    } catch (e) { setAssignStatus(e.response?.data?.detail || 'Failed to assign.'); }
  };

  const handleReport = async () => {
    if (!selectedPatient) return;
    setReportStatus('Generating…');
    try {
      await healthAPI.generateReport(selectedPatient.id || selectedPatient._id, 'Doctor Summary');
      setReportStatus('✓ Report sent to patient.');
    } catch (e) { setReportStatus(e.response?.data?.detail || 'Failed.'); }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await doctorAPI.acceptAppointmentRequest(requestId);
      await loadData();
    } catch (e) { console.error(e); }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await doctorAPI.rejectAppointmentRequest(requestId);
      await loadData();
    } catch (e) { console.error(e); }
  };

  const handleUpdateFee = async () => {
    const feeValue = Number(feeInput);
    if (Number.isNaN(feeValue) || feeValue < 0) {
      setFeeStatus('Enter a valid fee.');
      return;
    }
    setFeeStatus('Saving…');
    try {
      await doctorAPI.updateProfile({ appointment_fee: feeValue });
      setFeeStatus('✓ Fee updated.');
      await loadData();
    } catch (e) { setFeeStatus(e.response?.data?.detail || 'Failed to update fee.'); }
  };

  const handleUnlockVideo = async (patientId) => {
    if (!window.confirm('Unlock video analysis for this patient?')) return;
    try {
      await healthAPI.unlockVideoAnalysis(patientId);
      alert('✅ Video analysis unlocked! Patient can now upload and analyze videos.');
      loadData();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || 'Failed to unlock video analysis.'));
    }
  };

  const handleLockVideo = async (patientId) => {
    if (!window.confirm('Lock video analysis for this patient? They will no longer be able to upload videos until you unlock again.')) return;
    try {
      await healthAPI.lockVideoAnalysis(patientId);
      alert('✅ Video analysis locked for this patient.');
      loadData();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || 'Failed to lock video analysis.'));
    }
  };

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1 font-semibold">Doctor Dashboard</p>
              <h1 className="text-3xl font-bold text-white">
                Dr. {doctor?.first_name || doctor?.name || 'Doctor'}
              </h1>
              <p className="text-white/60 text-sm mt-1">{doctor?.specialization || 'General Practice'} · {doctor?.email}</p>
            </div>
            <button onClick={loadData}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Patients"    value={patients.length}                                                       icon="👥" color="bg-blue-50 text-blue-600" />
          <StatCard title="High Risk"         value={patients.filter(p => p.risk_level === 'High').length}                  icon="⚠️" color="bg-red-50 text-red-600" />
          <StatCard title="With Medications"  value={patients.filter(p => p.medication_count > 0).length}                   icon="💊" color="bg-purple-50 text-purple-600" />
          <StatCard title="Active Today"      value={patients.filter(p => p.last_assessment).length}                        icon="✅" color="bg-green-50 text-green-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Patient List ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Your Patients</h2>
              <span className="badge-info">{patients.length} total</span>
            </div>

            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients by name or email…"
              className="medo-input" />

            {filtered.length === 0 ? (
              <div className="medo-card p-12 text-center">
                <div className="text-5xl mb-3">👤</div>
                <p className="font-bold text-slate-700">No patients yet</p>
                <p className="text-slate-400 text-sm mt-2">Assign a patient using their email below.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p, i) => {
                  const pid = p.id || p._id;
                  const isSelected = (selectedPatient?.id || selectedPatient?._id) === pid;
                  return (
                    <motion.div key={pid} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className={`medo-card p-5 cursor-pointer transition-all border-2 ${isSelected ? 'border-secondary bg-teal-50/30' : 'border-transparent'}`}
                      onClick={() => handleSelectPatient(p)}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        {/* Avatar + info */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(p.first_name?.[0] || p.email?.[0] || 'P').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>
                            {p.date_of_birth && (
                              <p className="text-xs text-slate-400">DOB: {new Date(p.date_of_birth).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        {/* Risk badge + last assessment */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.risk_level && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              p.risk_level === 'High' ? 'bg-red-50 border-red-200 text-red-700' :
                              p.risk_level === 'Medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                              'bg-green-50 border-green-200 text-green-700'
                            }`}>{p.risk_level} Risk</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => navigate(`/chat/${pid}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                            💬 Chat
                          </button>
                          <button onClick={() => navigate(`/medications/${pid}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">
                            💊 Meds
                          </button>
                          <button onClick={() => navigate(`/doctor-patient/${pid}/history`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                            📁 History
                          </button>
                          <button onClick={() => handleUnlockVideo(pid)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors">
                            🎥 Unlock
                          </button>
                          <button onClick={() => handleLockVideo(pid)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">
                            🔒 Lock
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Appointment Requests ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Appointment Requests</h2>
                <span className="badge-info">{appointmentRequests.length} total</span>
              </div>

              {appointmentRequests.length === 0 ? (
                <div className="medo-card p-8 text-center">
                  <p className="text-slate-500 text-sm">No appointment requests yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointmentRequests.map((req) => (
                    <div key={req.id} className="medo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{req.patient_name || 'Patient'}</p>
                        <p className="text-xs text-slate-500">{req.patient_email}</p>
                        <p className="text-xs text-slate-500 mt-1">{req.preferred_date} · {req.preferred_time} · {req.meeting_mode?.replace('_', ' ')}</p>
                        {req.message && <p className="text-xs text-slate-600 mt-1">“{req.message}”</p>}
                        <p className="text-xs text-slate-700 mt-1">Fee: ₹{req.appointment_fee || 0}</p>
                      </div>
                      <div className="flex gap-2">
                        {req.status === 'pending' ? (
                          <>
                            <button onClick={() => handleAcceptRequest(req.id)} className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold">Accept</button>
                            <button onClick={() => handleRejectRequest(req.id)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold">Reject</button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-600 capitalize">{req.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Appointment fee */}
            <div className="medo-card p-5">
              <h3 className="font-bold text-slate-800 mb-3">Appointment Fee</h3>
              <input
                type="number"
                min="0"
                value={feeInput}
                onChange={e => setFeeInput(e.target.value)}
                placeholder="e.g., 300"
                className="medo-input mb-3"
              />
              <button onClick={handleUpdateFee} className="btn-teal w-full py-2.5 text-sm">
                Save Fee
              </button>
              {feeStatus && (
                <p className={`mt-2 text-xs font-medium ${feeStatus.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                  {feeStatus}
                </p>
              )}
            </div>

            {/* Assign patient */}
            <div className="medo-card p-5">
              <h3 className="font-bold text-slate-800 mb-3">Assign New Patient</h3>
              <input type="email" value={assignEmail} onChange={e => setAssignEmail(e.target.value)}
                placeholder="patient@email.com" className="medo-input mb-3" onKeyDown={e => e.key === 'Enter' && handleAssign()} />
              <button onClick={handleAssign} className="btn-teal w-full py-2.5 text-sm">
                Assign Patient
              </button>
              {assignStatus && (
                <p className={`mt-2 text-xs font-medium ${assignStatus.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                  {assignStatus}
                </p>
              )}
            </div>

            {/* Selected patient panel */}
            {selectedPatient && (
              <div className="medo-card p-5">
                <h3 className="font-bold text-slate-800 mb-4">
                  {selectedPatient.first_name || 'Patient'}'s Details
                </h3>

                {/* Quick nav */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Chat', icon: '💬', color: 'bg-blue-600', path: `/chat/${selectedPatient.id || selectedPatient._id}` },
                    { label: 'Medications', icon: '💊', color: 'bg-purple-600', path: `/medications/${selectedPatient.id || selectedPatient._id}` },
                    { label: 'History', icon: '📁', color: 'bg-slate-500', path: `/doctor-patient/${selectedPatient.id || selectedPatient._id}/history` },
                  ].map(btn => (
                    <button key={btn.label} onClick={() => navigate(btn.path)}
                      className={`${btn.color} text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity`}>
                      {btn.icon} {btn.label}
                    </button>
                  ))}
                </div>

                {/* Generate report */}
                <button onClick={handleReport} className="btn-primary w-full py-2.5 text-sm">
                  Generate AI Report
                </button>
                {reportStatus && (
                  <p className={`mt-2 text-xs font-medium ${reportStatus.startsWith('✓') ? 'text-green-600' : 'text-slate-600'}`}>
                    {reportStatus}
                  </p>
                )}

                {/* High risk alerts */}
                {alerts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">⚠️ High Risk Alerts</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {alerts.map((a, i) => (
                        <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700">{a.title || a.type}</p>
                          <p className="text-xs text-red-600 mt-0.5">{a.message || a.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

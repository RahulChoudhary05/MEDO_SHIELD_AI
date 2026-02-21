import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { healthAPI, doctorAPI } from '../services/api';
import { useAuthStore } from '../store/store';

// ── helpers ──────────────────────────────────────────────
const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Weekly', 'As needed'];
const DEFAULT_SLOTS = '09:30, 13:00, 21:00';

const RISK_COLOR = (level) => ({
  low: 'bg-green-50 border-green-200 text-green-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  high: 'bg-red-50 border-red-200 text-red-700',
}[level?.toLowerCase()] || 'bg-blue-50 border-blue-200 text-blue-700');

// Safe stringify helper – prevents React from trying to render plain objects
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  try { return JSON.stringify(val); } catch { return ''; }
};

// Helper to extract error message from various response formats
const extractErrorMessage = (error) => {
  try {
    if (!error) return 'An error occurred. Please try again.';
    
    const data = error.response?.data;
    if (!data) return 'Network error. Please check your connection.';
    
    // Handle string detail
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    
    // Handle array of validation errors
    if (Array.isArray(data.detail)) {
      return data.detail
        .map(d => typeof d === 'string' ? d : (d.msg || JSON.stringify(d)))
        .join('; ');
    }
    
    // Handle object detail
    if (data.detail && typeof data.detail === 'object') {
      return data.detail.msg || JSON.stringify(data.detail);
    }
    
    // Fallback to message
    if (data.message) return data.message;
    
    // Fallback to string representation
    return JSON.stringify(data);
  } catch (e) {
    return 'An unexpected error occurred. Please try again.';
  }
};

// ─────────────────────────────────────────────────────────
export default function Medications() {
  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const isDoctor = role === 'doctor';

  // Use URL param OR fall back to logged-in user's id
  const patientId = routePatientId || user?.id || user?._id || user?.user_id;

  // Data
  const [medications, setMedications] = useState([]);
  const [schedule, setSchedule]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Doctor Add-Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');
  const [useDefault, setUseDefault]   = useState(true);
  const [formData, setFormData]       = useState({
    name: '', dosage: '', frequency: '', time_slots: DEFAULT_SLOTS,
    duration_days: '', side_effects: '', notes: ''
  });

  // AI Recommendations (patient view only)
  const [recInput, setRecInput]   = useState({ symptoms: '', age: '' });
  const [recLoading, setRecLoading] = useState(false);
  const [recResults, setRecResults] = useState(null);
  const [recError, setRecError]   = useState('');

  // ── Load ──────────────────────────────────────────────
  const loadMedications = useCallback(async () => {
    if (!patientId) return;
    setLoading(true); setError('');
    try {
      const res = await healthAPI.getMedicationSchedule(patientId);
      setMedications(res.data.medications || []);
      setSchedule(res.data.daily_schedule || {});
    } catch (e) {
      setError('Failed to load medications. Please try again.');
      console.error(e);
    } finally { setLoading(false); }
  }, [patientId]);


  useEffect(() => { loadMedications(); }, [loadMedications]);

  // ── Doctor: Add Medication ────────────────────────────
  const handleAddMedication = async () => {
    if (!formData.name || !formData.dosage || !formData.frequency) {
      setSaveMsg('Please fill all required fields (Name, Dosage, Frequency).');
      return;
    }
    setSaving(true); setSaveMsg('');
    try {
      const payload = {
        ...formData,
        time_slots: useDefault
          ? DEFAULT_SLOTS.split(',').map(s => s.trim())
          : formData.time_slots.split(',').map(s => s.trim()).filter(Boolean),
        side_effects: formData.side_effects.split(',').map(s => s.trim()).filter(Boolean),
        duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
      };
      await doctorAPI.addMedication(patientId, payload);
      setSaveMsg('✓ Medication saved successfully. Patient will receive time-based alerts.');
      setFormData({ name: '', dosage: '', frequency: '', time_slots: DEFAULT_SLOTS, duration_days: '', side_effects: '', notes: '' });
      setUseDefault(true);
      await loadMedications();
      setTimeout(() => { setShowAddForm(false); setSaveMsg(''); }, 3000);
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      setSaveMsg(errorMsg);
      console.error('Medication save error:', e);
    } finally { setSaving(false); }
  };

  // ── Patient: AI Recommendations (symptoms + age only) ─
  const handleGetRecommendations = async () => {
    if (!recInput.symptoms.trim()) { setRecError('Please describe your symptoms.'); return; }
    setRecLoading(true); setRecError(''); setRecResults(null);
    try {
      const res = await healthAPI.getMedicationRecommendations({
        patient_id: patientId,
        symptoms: [recInput.symptoms],
        age: recInput.age ? parseInt(recInput.age) : null,
      });
      setRecResults(res.data);
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      setRecError(errorMsg);
      console.error('Recommendation error:', e);
    } finally { setRecLoading(false); }
  };

  // ── Render ────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading medications...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1 font-semibold">
                {isDoctor ? 'Doctor View' : 'Patient View'} · Medication Management
              </p>
              <h1 className="text-3xl font-bold text-white">Medication Schedule</h1>
              <p className="text-white/60 text-sm mt-1">
                {isDoctor
                  ? 'Add and manage patient medications — alerts are sent automatically.'
                  : 'View your prescribed medications and get AI-assisted suggestions.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate(isDoctor ? '/doctor-dashboard' : '/dashboard')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                ← Back
              </button>
              {isDoctor && (
                <button onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shadow">
                  <span className="text-lg">+</span> Add Medication
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {error && <div className="alert-error">{error}</div>}

        {/* ── DOCTOR: Add Medication Modal ── */}
        <AnimatePresence>
          {isDoctor && showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowAddForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Add New Medication</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Patient will receive time-based alerts on their dashboard.</p>
                  </div>
                  <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Medication Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medication Name *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="medo-input" placeholder="e.g., Aspirin" />
                  </div>

                  {/* Dosage */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dosage *</label>
                    <input type="text" value={formData.dosage} onChange={e => setFormData(p => ({ ...p, dosage: e.target.value }))}
                      className="medo-input" placeholder="e.g., 500mg" />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frequency *</label>
                    <select value={formData.frequency} onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))} className="medo-input">
                      <option value="">Select frequency</option>
                      {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (days)</label>
                    <input type="number" value={formData.duration_days} onChange={e => setFormData(p => ({ ...p, duration_days: e.target.value }))}
                      className="medo-input" placeholder="e.g., 30 (leave blank for ongoing)" min={1} />
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time Slots</label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={useDefault} onChange={e => setUseDefault(e.target.checked)} className="w-4 h-4 accent-secondary" />
                      <span className="text-sm text-slate-600">Use default schedule ({DEFAULT_SLOTS})</span>
                    </label>
                    {!useDefault && (
                      <input type="text" value={formData.time_slots}
                        onChange={e => setFormData(p => ({ ...p, time_slots: e.target.value }))}
                        className="medo-input" placeholder="e.g., 09:00, 13:00, 21:00" />
                    )}
                  </div>

                  {/* Side Effects */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Side Effects</label>
                    <input type="text" value={formData.side_effects} onChange={e => setFormData(p => ({ ...p, side_effects: e.target.value }))}
                      className="medo-input" placeholder="e.g., Dizziness, Nausea (comma-separated)" />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                    <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="medo-input resize-none" rows={3} placeholder="Additional instructions or notes..." />
                  </div>

                  {saveMsg && (
                    <div className={saveMsg.startsWith('✓') ? 'alert-success' : 'alert-error'} >{saveMsg}</div>
                  )}
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button onClick={handleAddMedication} disabled={saving} className="btn-teal flex-1 py-3">
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Saving...
                      </span>
                    ) : 'Save Medication'}
                  </button>
                  <button onClick={() => { setShowAddForm(false); setSaveMsg(''); }} className="btn-outline px-6 py-3">Cancel</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Current Medications ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {isDoctor ? 'Patient\'s Current Medications' : '✅ Current Medications'}
            </h2>
            <span className="badge-info">{medications.length} active</span>
          </div>

          {medications.length === 0 ? (
            <div className="medo-card p-12 text-center">
              <div className="text-5xl mb-4">💊</div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">No medications yet</h3>
              <p className="text-slate-400 text-sm">
                {isDoctor ? 'Click "Add Medication" to prescribe medications for this patient.' : 'No medications have been prescribed yet.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {medications.map((med, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="medo-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: name + info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">💊</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800">{med.name || med.medication_name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                          <span className="font-semibold text-slate-700">{med.dosage}</span>
                          <span>·</span>
                          <span>{med.frequency}</span>
                          {med.duration_days && <><span>·</span><span>{med.duration_days} days</span></>}
                        </div>

                        {/* Time slots */}
                        {med.time_slots?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {med.time_slots.map((slot, si) => (
                              <span key={si} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                                🕐 {slot}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Side effects */}
                        {med.side_effects?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-400 mb-1">Possible side effects:</p>
                            <div className="flex flex-wrap gap-1">
                              {med.side_effects.map((se, si) => (
                                <span key={si} className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-md text-xs">{se}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {med.notes && (
                          <p className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            <span className="font-semibold">Note:</span> {med.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: status + alert badge */}
                    <div className="flex flex-col gap-2 sm:items-end">
                      <span className={`badge-success`}>Doctor Prescribed</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs font-semibold">
                        🔔 Alerts Active
                      </span>
                      {med.added_by_doctor && (
                        <p className="text-xs text-slate-400">by Dr. {med.doctor_name || 'Your Doctor'}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── Daily Schedule ── */}
        {Object.keys(schedule).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Today's Schedule</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(schedule).map(([time, meds]) => (
                <div key={time} className="medo-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">🕐</div>
                    <p className="font-bold text-slate-800 text-base">{time}</p>
                  </div>
                  <div className="space-y-2">
                    {(Array.isArray(meds) ? meds : [meds]).map((med, i) => (
                      <p key={i} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                        {typeof med === 'string' ? med : `${med.name} ${med.dosage || ''}`}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Recommendations (Patient Only) ── */}
        {!isDoctor && (
          <div className="medo-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🧠</div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">AI Medication Suggestions</h2>
                <p className="text-slate-400 text-sm">Gemini AI suggestions based on symptoms. Always review with your doctor.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Symptoms */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Symptoms *</label>
                <input type="text" value={recInput.symptoms}
                  onChange={e => setRecInput(p => ({ ...p, symptoms: e.target.value }))}
                  className="medo-input" placeholder="e.g., headache, fever, fatigue" />
              </div>

              {/* Age only — no Conditions */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Age</label>
                <input type="number" value={recInput.age}
                  onChange={e => setRecInput(p => ({ ...p, age: e.target.value }))}
                  className="medo-input" placeholder="e.g., 42" min={1} max={120} />
              </div>

              <div className="sm:col-span-2">
                {recError && <p className="alert-error mb-3 text-xs">{recError}</p>}
                <button onClick={handleGetRecommendations} disabled={recLoading}
                  className="btn-primary w-full sm:w-auto px-8 py-3">
                  {recLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Getting AI Suggestions...
                    </span>
                  ) : 'Generate Suggestions'}
                </button>
              </div>
            </div>

            {/* AI Results */}
            <AnimatePresence>
              {recResults && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                      {recResults.matched_condition
                        ? `Matched Condition: ${safeStr(recResults.matched_condition)}`
                        : 'AI Analysis'}
                    </p>
                    {recResults.ai_analysis && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{safeStr(recResults.ai_analysis)}</p>
                    )}
                  </div>

                  {Array.isArray(recResults.medications) && recResults.medications.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {recResults.medications.map((med, i) => (
                        <div key={i} className={`rounded-xl p-4 border ${RISK_COLOR(med.risk_level || 'low')}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-sm">{safeStr(med.name)}</h4>
                            {med.confidence != null && (
                              <span className="text-xs font-semibold flex-shrink-0">{safeStr(med.confidence)}% match</span>
                            )}
                          </div>
                          {med.dosage && <p className="text-xs mt-1"><strong>Dosage:</strong> {safeStr(med.dosage)}</p>}
                          {med.frequency && <p className="text-xs mt-0.5"><strong>Frequency:</strong> {safeStr(med.frequency)}</p>}
                          {med.max_daily && <p className="text-xs mt-0.5"><strong>Max daily:</strong> {safeStr(med.max_daily)}</p>}
                          {med.age_group && <p className="text-xs mt-0.5 opacity-60">Group: {safeStr(med.age_group)}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {(!Array.isArray(recResults.medications) || recResults.medications.length === 0) && (
                    <div className="text-center py-4 bg-slate-50 rounded-xl text-slate-400 text-sm">
                      No specific medications matched in the dataset. See the AI analysis above or consult your doctor.
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic">
                    ⚠️ These are AI-generated suggestions only. Please consult your doctor before taking any medication.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

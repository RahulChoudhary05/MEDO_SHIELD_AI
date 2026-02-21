import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { healthAPI } from '../services/api';

const FitnessTracking = () => {
  const { user } = useAuthStore();
  const patientId = user?.id || user?._id || user?.user_id;

  // States
  const [activeTab, setActiveTab] = useState('record'); // record, history, analysis
  const [fitnessRecords, setFitnessRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bmi: '',
    stressLevel: 5,
    walkingDistance: '',
    heartRate: '',
    sleepHours: '',
    notes: '',
  });

  // Load records when patientId is available
  useEffect(() => {
    if (patientId) loadRecords();
  }, [patientId]);

  // Auto-generate analysis when switching to the analysis tab (not on every record change)
  useEffect(() => {
    if (fitnessRecords.length >= 3 && activeTab === 'analysis' && !aiAnalysis) {
      generateAiAnalysis();
    }
  }, [activeTab, fitnessRecords.length]);

  const loadRecords = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError('');
      const res = await healthAPI.getFitnessRecords(patientId);
      const raw = res.data?.records || [];
      const mapped = raw.map((r, i) => ({
        id: r._id || r.id || i + 1,
        date: r.date || new Date().toISOString().split('T')[0],
        bmi: r.bmi,
        stressLevel: r.stressLevel ?? r.stress_level ?? 5,
        walkingDistance: r.walkingDistance ?? r.walking_distance,
        heartRate: r.heartRate ?? r.heart_rate,
        sleepHours: r.sleepHours ?? r.sleep_hours,
      })).filter(r => r.date && (r.bmi != null || r.walkingDistance != null));
      setFitnessRecords(mapped);
    } catch (err) {
      setError('Failed to load fitness records. You can still add new records.');
      setFitnessRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAiAnalysis = async () => {
    if (!patientId || fitnessRecords.length < 3) {
      setError('Need at least 3 days of data for AI analysis.');
      return;
    }
    try {
      setGeneratingAnalysis(true);
      setError('');
      const payload = {
        patientId,
        records: fitnessRecords.map(r => ({
          date: r.date,
          bmi: r.bmi,
          stressLevel: r.stressLevel,
          walkingDistance: r.walkingDistance,
          heartRate: r.heartRate,
          sleepHours: r.sleepHours,
        })),
      };
      const res = await healthAPI.analyzeFitness(payload);
      if (res.data && !res.data.error) {
        setAiAnalysis(res.data);
      } else {
        generateFallbackAnalysis();
      }
    } catch (err) {
      console.warn('AI analysis failed, using fallback:', err);
      generateFallbackAnalysis();
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const generateFallbackAnalysis = () => {
    const latestRecord = fitnessRecords[0] || {};
    const count = fitnessRecords.length || 1;
    const avgBmi = (fitnessRecords.reduce((sum, r) => sum + (parseFloat(r.bmi) || 0), 0) / count).toFixed(1);
    const avgStress = (fitnessRecords.reduce((sum, r) => sum + (parseFloat(r.stressLevel) || 0), 0) / count).toFixed(1);
    const avgSleep = (fitnessRecords.reduce((sum, r) => sum + (parseFloat(r.sleepHours) || 0), 0) / count).toFixed(1);
    const avgWalking = (fitnessRecords.reduce((sum, r) => sum + (parseFloat(r.walkingDistance) || 0), 0) / count).toFixed(1);

    setAiAnalysis({
      summary: '📊 Your Health Summary',
      overallStatus: 'Good Progress',
      recommendations: [
        {
          category: '📈 BMI Trend',
          status: latestRecord.bmi < 26 ? '✅ Improving' : '⚠️ Watch',
          message: `Your BMI is ${latestRecord.bmi} (Average: ${avgBmi}). ${latestRecord.bmi < 26 ? 'Great! Keep maintaining healthy habits.' : 'Consider increasing exercise and reducing calorie intake.'}`,
        },
        {
          category: '😌 Stress Level',
          status: latestRecord.stressLevel <= 5 ? '✅ Healthy' : '⚠️ High',
          message: `Current stress: ${latestRecord.stressLevel}/10 (Average: ${avgStress}). ${latestRecord.stressLevel > 6 ? 'Try meditation, yoga, or deep breathing exercises.' : 'Your stress levels are well-managed.'}`,
        },
        {
          category: '😴 Sleep Quality',
          status: latestRecord.sleepHours >= 7 ? '✅ Excellent' : '⚠️ Needs Work',
          message: `You're sleeping ${latestRecord.sleepHours} hours (Target: 7-9 hours). ${latestRecord.sleepHours < 7 ? 'Try maintaining a consistent sleep schedule and avoid screens before bed.' : 'Your sleep is optimal for recovery.'}`,
        },
        {
          category: '🚶 Physical Activity',
          status: latestRecord.walkingDistance >= 6 ? '✅ Active' : '⚠️ Increase Activity',
          message: `Daily walking: ${latestRecord.walkingDistance} km (Average: ${avgWalking} km). ${latestRecord.walkingDistance < 6 ? 'Aim for at least 6-7 km daily (60-90 minutes of walking).' : 'Excellent daily activity! Keep it up.'}`,
        },
      ],
      actionPlan: [
        '1️⃣ Maintain consistent sleep schedule (10 PM - 6 AM)',
        '2️⃣ Walk at least 60 minutes daily',
        '3️⃣ Practice 10 minutes of meditation or yoga',
        `4️⃣ Stay hydrated (drink 2-3 liters of water daily)`,
        '5️⃣ Track weekly progress and adjust as needed',
      ],
      weeklyGoals: {
        bmi: `Target: Below 25.5 (Current: ${latestRecord.bmi})`,
        stress: `Target: 4/10 or less (Current: ${latestRecord.stressLevel})`,
        sleep: `Target: 7-8 hours (Current: ${latestRecord.sleepHours}h)`,
        walking: `Target: 6-7 km daily (Current: ${latestRecord.walkingDistance} km)`,
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) {
      setError('Please log in to save records.');
      return;
    }
    if (!formData.bmi || !formData.walkingDistance) {
      setError('Please fill in required fields (BMI, Walking Distance)');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const payload = {
        date: formData.date,
        bmi: parseFloat(formData.bmi),
        stressLevel: parseInt(formData.stressLevel, 10),
        walkingDistance: parseFloat(formData.walkingDistance),
        heartRate: formData.heartRate ? parseInt(formData.heartRate, 10) : null,
        sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : null,
        notes: formData.notes || '',
      };
      await healthAPI.addFitnessRecord(patientId, payload);
      await loadRecords();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bmi: '',
        stressLevel: 5,
        walkingDistance: '',
        heartRate: '',
        sleepHours: '',
        notes: '',
      });
      setActiveTab('history');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save fitness record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 Fitness & Smartwatch Tracking</h1>
          <p className="text-gray-600">Track your health metrics and get AI-powered insights powered by Gemini AI</p>
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
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'record', label: '📝 Record Data', icon: '➕' },
            { id: 'history', label: '📊 History', icon: '📈' },
            { id: 'analysis', label: '🤖 AI Analysis', icon: '✨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-indigo-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Record Tab */}
        {activeTab === 'record' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Record Today's Health Data</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* BMI */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">⚖️ BMI (Required)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 25.5"
                    value={formData.bmi}
                    onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Stress Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    😌 Stress Level: {formData.stressLevel}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.stressLevel}
                    onChange={(e) => setFormData({...formData, stressLevel: e.target.value})}
                    className="w-full"
                  />
                </div>

                {/* Walking Distance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🚶 Walking Distance (km) (Required)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 5.5"
                    value={formData.walkingDistance}
                    onChange={(e) => setFormData({ ...formData, walkingDistance: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Heart Rate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">❤️ Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="e.g., 72"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Sleep Hours */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">😴 Sleep Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 7.5"
                    value={formData.sleepHours}
                    onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notes (Optional)</label>
                <textarea
                  placeholder="Any additional notes about your health today..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {loading ? '⏳ Saving...' : '✅ Save Record'}
              </button>
            </form>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Your Health History</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : fitnessRecords.length === 0 ? (
                <p className="text-center text-gray-500">No records yet. Start by recording your data!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Date</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">BMI</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Stress</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Walking</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Heart Rate</th>
                        <th className="text-center py-3 px-4 font-bold text-gray-700">Sleep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fitnessRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900 font-medium">{record.date}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full font-semibold ${
                              record.bmi < 25 ? 'bg-green-100 text-green-800' :
                              record.bmi < 27 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.bmi}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full font-semibold ${
                              record.stressLevel <= 5 ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {record.stressLevel}/10
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900">{record.walkingDistance} km</td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900">{record.heartRate || '—'} bpm</td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900">{record.sleepHours || '—'}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {fitnessRecords.length < 3 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-blue-900 font-semibold text-lg mb-2">
                  Need at least 3 days of data for AI analysis.
                </p>
                <p className="text-blue-700 text-sm">You have {fitnessRecords.length} record(s). Add {3 - fitnessRecords.length} more to unlock AI insights.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">🤖 AI Analysis — {fitnessRecords.length} days of data</h2>
                  <button
                    onClick={() => { setAiAnalysis(null); generateAiAnalysis(); }}
                    disabled={generatingAnalysis}
                    className="px-4 py-2 bg-white border-2 border-indigo-400 text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    {generatingAnalysis ? '⏳ Analyzing...' : '🔄 Refresh Analysis'}
                  </button>
                </div>

                {generatingAnalysis && (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-700 font-semibold">🤖 Gemini AI is analyzing your health data...</p>
                    <p className="text-gray-500 text-sm mt-1">Building your personalized roadmap</p>
                  </div>
                )}

                {aiAnalysis && (
                  <>
                    {(() => {
                      const recommendations = Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations : [];
                      const actionPlan = Array.isArray(aiAnalysis.actionPlan) ? aiAnalysis.actionPlan : [];
                      const weeklyGoals = aiAnalysis.weeklyGoals && typeof aiAnalysis.weeklyGoals === 'object'
                        ? aiAnalysis.weeklyGoals
                        : {};

                      return (
                        <>
                    {/* Overall Status */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
                      <h2 className="text-3xl font-bold mb-4">🎯 {aiAnalysis.summary}</h2>
                      <p className="text-lg text-blue-100">Status: <span className="font-bold text-white">{aiAnalysis.overallStatus}</span></p>
                    </div>

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-lg font-bold text-gray-900">{rec.category}</h3>
                              <span className="text-xl">{rec.status}</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed">{rec.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Plan */}
                    {actionPlan.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">📋 Your Personal Action Plan</h3>
                        <div className="space-y-3">
                          {actionPlan.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                              <span className="text-2xl flex-shrink-0">📌</span>
                              <p className="text-gray-900 font-semibold">{action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weekly Goals */}
                    {Object.keys(weeklyGoals).length > 0 && (
                      <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">🎯 Weekly Goals</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(weeklyGoals).map(([key, value]) => (
                            <div key={key} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-700 mb-1">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                              <p className="font-bold text-gray-900">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FitnessTracking;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { healthAPI } from '../services/api';

export default function HealthTimeline() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadTimeline();
    }
  }, [patientId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await healthAPI.getRiskTimeline(patientId, 90);
      setTimeline(response.data.timeline || []);
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'moderate': return '#eab308';
      case 'low': return '#16a34a';
      default: return '#64748b';
    }
  };

  const getRiskBgColor = (level) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-50 border-red-300';
      case 'high': return 'bg-orange-50 border-orange-300';
      case 'moderate': return 'bg-yellow-50 border-yellow-300';
      case 'low': return 'bg-green-50 border-green-300';
      default: return 'bg-slate-50 border-slate-300';
    }
  };

  const chartData = timeline.map(assessment => ({
    date: new Date(assessment.risk_date).toLocaleDateString(),
    risk_score: assessment.disease_risk_score,
    level: assessment.disease_risk_level
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading health timeline...</p>
        </div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg font-semibold">No patient selected.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">📊 Health Risk Timeline</h1>
            <p className="text-blue-100">90-day health trend analysis</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            ← Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Risk Trend Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 mb-8"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Risk Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRisk)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-700">
                <strong>Interpretation:</strong> Higher risk scores indicate elevated disease probability. Track trends to identify concerning patterns.
              </p>
            </div>
          </motion.div>
        )}

        {/* Timeline List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">📅 Assessment History</h2>
          
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No assessments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.map((assessment, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedAssessment(assessment)}
                  className={`p-5 rounded-lg border-2 cursor-pointer hover:shadow-md transition ${getRiskBgColor(assessment.disease_risk_level)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: getRiskColor(assessment.disease_risk_level) }}>
                          {assessment.disease_risk_level}
                        </span>
                        <p className="text-slate-700 font-semibold">
                          {new Date(assessment.risk_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <p className="text-slate-600 mt-2 text-sm">Risk Score: <strong>{assessment.disease_risk_score.toFixed(1)}</strong>/100</p>
                      
                      {assessment.risk_factors && assessment.risk_factors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-700">Risk Factors:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {assessment.risk_factors.slice(0, 3).map((factor, i) => (
                              <span key={i} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                      Details
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Assessment Details Modal */}
        <AnimatePresence>
          {selectedAssessment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedAssessment(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">Assessment Details</h2>
                  <button
                    onClick={() => setSelectedAssessment(null)}
                    className="text-slate-600 hover:text-slate-900 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-slate-600 mb-1">Assessment Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {new Date(selectedAssessment.risk_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">Risk Level</p>
                      <p className="text-lg font-bold text-slate-900" style={{
                        color: getRiskColor(selectedAssessment.disease_risk_level)
                      }}>
                        {selectedAssessment.disease_risk_level}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">Risk Score</p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedAssessment.disease_risk_score.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">Next Screening</p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedAssessment.next_screening_date 
                          ? new Date(selectedAssessment.next_screening_date).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </p>
                    </div>
                  </div>

                  {selectedAssessment.risk_factors && selectedAssessment.risk_factors.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2">Risk Factors</h3>
                      <ul className="space-y-2">
                        {selectedAssessment.risk_factors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                            <span className="text-red-600 mt-1">⚠️</span>
                            <span className="text-slate-700">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAssessment.recommendations && selectedAssessment.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2">Recommendations</h3>
                      <ul className="space-y-2">
                        {selectedAssessment.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <span className="text-green-600 mt-1">✓</span>
                            <span className="text-slate-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAssessment.lab_results && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2">Lab Results</h3>
                      <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto max-h-48">
                        {JSON.stringify(selectedAssessment.lab_results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

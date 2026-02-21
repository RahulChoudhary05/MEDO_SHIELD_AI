import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { healthAPI } from '../services/api';
import { useAuthStore } from '../store/store';

export default function HealthHistory() {
  const navigate = useNavigate();
  const { patientId: routePatientId } = useParams();
  const { user, role } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const patientId = routePatientId || user?.id || user?._id || user?.user_id;
      if (!patientId) {
        throw new Error('Missing patient identifier.');
      }
      const response = await healthAPI.getHealthHistory(patientId, 100);
      // Sort by date, newest first
      const sortedHistory = (response.data.history || []).sort((a, b) => 
        new Date(b.created_at || b.recorded_at) - new Date(a.created_at || a.recorded_at)
      );
      setHistory(sortedHistory);
      setSummary(response.data.summary || {});
    } catch (err) {
      console.error('Failed to load health history:', err);
    } finally {
      setLoading(false);
    }
  }, [routePatientId, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const downloadPDF = async (entryId, patientName) => {
    try {
      const response = await fetch(`http://localhost:8000/api/health/video/analysis/${entryId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Neuro_Assessment_${patientName}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  const filteredHistory = (filter === 'all' 
    ? history 
    : history.filter(entry => entry.type === filter))
    .filter(entry => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (entry.title || entry.type || '').toLowerCase().includes(searchLower) ||
             (entry.summary || entry.analysis || '').toLowerCase().includes(searchLower);
    });

  const getTypeIcon = (type) => {
    switch(type) {
      case 'video_analysis':
        return '🎥';
      case 'ai_report':
        return '📋';
      case 'medication_recommendation':
        return '💊';
      case 'risk_assessment':
        return '⚠️';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'video_analysis':
        return 'from-blue-500 to-blue-700';
      case 'ai_report':
        return 'from-green-500 to-green-700';
      case 'medication_recommendation':
        return 'from-purple-500 to-purple-700';
      case 'risk_assessment':
        return 'from-red-500 to-red-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                📜 Health History
              </h1>
              <p className="text-blue-100">Complete medical record and analysis history</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              ← Back
            </motion.button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white"
            >
              <div className="text-3xl mb-2">🎥</div>
              <div className="text-2xl font-bold">{summary.video_analyses || 0}</div>
              <div className="text-sm opacity-90">Video Analyses</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white"
            >
              <div className="text-3xl mb-2">📋</div>
              <div className="text-2xl font-bold">{summary.ai_reports || 0}</div>
              <div className="text-sm opacity-90">AI Reports</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 text-white"
            >
              <div className="text-3xl mb-2">💊</div>
              <div className="text-2xl font-bold">{summary.medication_recommendations || 0}</div>
              <div className="text-sm opacity-90">Medications</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-4 text-white"
            >
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-2xl font-bold">{summary.risk_assessments || 0}</div>
              <div className="text-sm opacity-90">Risk Assessments</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {['all', 'video_analysis', 'ai_report', 'medication_recommendation', 'risk_assessment'].map((filterType) => (
            <motion.button
              key={filterType}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === filterType
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {filterType === 'all' ? '📚 All' : `${getTypeIcon(filterType)} ${filterType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
            </motion.button>
          ))}
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">Loading health history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600">No records found</p>
              <p className="text-gray-500 mt-2">Your health history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredHistory.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-all"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTypeColor(entry.type)} flex items-center justify-center text-2xl`}>
                        {getTypeIcon(entry.type)}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{entry.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          <span>📅 {new Date(entry.created_at).toLocaleDateString()}</span>
                          <span>🕐 {new Date(entry.created_at).toLocaleTimeString()}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {entry.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {entry.has_pdf && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPDF(entry.id, user?.first_name || 'Patient');
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm"
                        >
                          📄 Download PDF
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                      >
                        View Details
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className={`p-6 bg-gradient-to-r ${getTypeColor(selectedEntry.type)} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-4xl">{getTypeIcon(selectedEntry.type)}</div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEntry.title}</h2>
                      <p className="text-sm opacity-90">
                        {new Date(selectedEntry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedEntry(null)}
                    className="text-white text-3xl font-bold hover:bg-white/20 w-10 h-10 rounded-full"
                  >
                    ×
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                {selectedEntry.type === 'video_analysis' && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Analysis Report</h3>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedEntry.data.report_content}
                      </p>
                    </div>
                    {selectedEntry.data.medications_recommended?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-bold text-gray-900 mb-2">Medications Recommended:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.data.medications_recommended.map((med, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                              💊 {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedEntry.type === 'medication_recommendation' && (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900">Symptoms:</h4>
                      <p className="text-gray-700">{selectedEntry.data.symptoms}</p>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900">Matched Condition:</h4>
                      <p className="text-gray-700">{selectedEntry.data.matched_condition}</p>
                    </div>
                    {selectedEntry.data.medications?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-gray-900 mb-3">Recommended Medications:</h4>
                        <div className="space-y-3">
                          {selectedEntry.data.medications.map((med, idx) => (
                            <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-bold text-purple-900">{med.name}</h5>
                                  <p className="text-sm text-gray-600 mt-1">
                                    <strong>Dosage:</strong> {med.dosage}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <strong>Frequency:</strong> {med.frequency}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <strong>Max Daily:</strong> {med.max_daily}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-semibold">
                                  {med.confidence}% match
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedEntry.data.ai_analysis && (
                      <div className="mt-4 bg-blue-50 rounded-lg p-4">
                        <h4 className="font-bold text-blue-900 mb-2">AI Analysis:</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedEntry.data.ai_analysis}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedEntry.type === 'ai_report' && (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">Key Findings:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedEntry.data.key_findings?.map((finding, idx) => (
                          <li key={idx} className="text-gray-700">{finding}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedEntry.data.recommendations?.map((rec, idx) => (
                          <li key={idx} className="text-gray-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedEntry.data.content}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEntry.type === 'risk_assessment' && (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900">Risk Level:</h4>
                      <span className={`inline-block px-4 py-2 rounded-full font-bold text-white ${
                        selectedEntry.data.disease_risk_level === 'High' ? 'bg-red-600' :
                        selectedEntry.data.disease_risk_level === 'Medium' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}>
                        {selectedEntry.data.disease_risk_level}
                      </span>
                    </div>
                    {selectedEntry.data.recommendations?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-bold text-gray-900 mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedEntry.data.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-gray-700">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    {selectedEntry.has_pdf && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => downloadPDF(selectedEntry.id, user?.first_name || 'Patient')}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                      >
                        📄 Download PDF Report
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedEntry(null)}
                      className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

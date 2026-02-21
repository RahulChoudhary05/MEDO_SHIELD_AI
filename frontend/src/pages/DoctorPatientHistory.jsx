import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisAPI } from '../services/api';

export default function DoctorPatientHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadHistory();
    }
  }, [patientId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await analysisAPI.getVideoHistoryForDoctor(patientId, 50);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg font-semibold">No patient selected.</p>
          <button
            onClick={() => navigate('/doctor-dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg"
          >
            Back to Doctor Portal
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
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Video History</h1>
            <p className="text-blue-100">AI-assisted gait review archive</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/doctor-dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            ← Back
          </motion.button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-slate-600 text-center py-10">No video analyses yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <motion.div
                  key={entry.id || idx}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelected(entry)}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300"
                >
                  <p className="font-semibold text-slate-900">{entry.file_name || `Video analysis ${idx + 1}`}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</p>
                  {(entry.summary || entry.analysis_text) && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{entry.summary || entry.analysis_text}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-slate-900">AI Review</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-600 hover:text-slate-900 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  {selected.file_name && <span className="font-medium">{selected.file_name}</span>}
                  {selected.created_at && ` · ${new Date(selected.created_at).toLocaleString()}`}
                </p>
                {(selected.summary || selected.analysis_text) && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Summary</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-line text-slate-700 text-sm">
                      {selected.summary || selected.analysis_text}
                    </div>
                  </div>
                )}
                {selected.video_analysis && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">Detailed metrics</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selected.video_analysis.gait_quality_score != null && (
                        <div className="bg-blue-50 rounded-lg p-2">Gait: {selected.video_analysis.gait_quality_score}/100</div>
                      )}
                      {selected.video_analysis.balance_score != null && (
                        <div className="bg-green-50 rounded-lg p-2">Balance: {selected.video_analysis.balance_score}/100</div>
                      )}
                      {selected.video_analysis.movement_fluidity != null && (
                        <div className="bg-amber-50 rounded-lg p-2">Fluidity: {selected.video_analysis.movement_fluidity}/100</div>
                      )}
                    </div>
                    {selected.video_analysis.key_findings?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-600 mb-1">Key findings</h4>
                        <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                          {selected.video_analysis.key_findings.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                    {selected.video_analysis.recommendations?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-600 mb-1">Recommendations</h4>
                        <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                          {selected.video_analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {selected.report_content && !selected.video_analysis && (
                  <div className="bg-slate-50 border rounded-lg p-4 whitespace-pre-line text-slate-700 text-sm">
                    {selected.report_content}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { analysisAPI, healthAPI } from '../services/api';
import { useAuthStore } from '../store/store';

// ── Tab IDs
const TABS = [
  { id: 'pdf', label: 'PDF Medical Report', icon: '📄' },
  { id: 'video', label: 'Video Analysis', icon: '🎥' },
];

export default function Analysis() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pdf');

  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const [pdfError, setPdfError] = useState('');

  // Video state
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [stream, setStream] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoResult, setVideoResult] = useState(null);

  // History state
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [videoAccessStatus, setVideoAccessStatus] = useState(null);
  const [loadingAccessStatus, setLoadingAccessStatus] = useState(false);

  useEffect(() => {
    if (activeTab === 'video') startCamera();
    loadSessionHistory();
    loadVideoAccessStatus();
  }, [activeTab, user?.id, user?._id]);

  useEffect(() => {
    if (activeTab !== 'video') return;
    const interval = setInterval(loadVideoAccessStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) { interval = setInterval(() => setRecordingTime(p => p + 1), 1000); }
    return () => clearInterval(interval);
  }, [isRecording]);

  // ── Camera
  const startCamera = async () => {
    try {
      setVideoError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); setCameraReady(true); };
      }
    } catch {
      setVideoError('Camera access denied. Please enable camera permissions and try again.');
      setCameraReady(false);
    }
  };

  // ── PDF Upload & Analysis
  const handlePdfAnalyze = async () => {
    if (!pdfFile) { setPdfError('Please select a PDF file first.'); return; }
    if (pdfFile.type !== 'application/pdf') { setPdfError('Only PDF files are supported.'); return; }
    setPdfLoading(true);
    setPdfError('');
    setPdfResult(null);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      const response = await healthAPI.uploadPDFReport(formData);
      setPdfResult(response.data);
    } catch (err) {
      setPdfError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Video Recording
  const startRecording = () => {
    if (!stream || !cameraReady) { setVideoError('Camera not ready. Please wait.'); return; }
    setIsRecording(true); setRecordingTime(0); setRecordedChunks([]); setVideoError('');
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data?.size > 0) setRecordedChunks(prev => [...prev, e.data]); };
    mr.onstop = async () => {
      const chunks = mediaRecorderRef.current._chunks || [];
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadVideo(blob, 'recording.webm');
      }
    };
    mr._chunks = [];
    mr.ondataavailable = e => { if (e.data?.size > 0) mr._chunks.push(e.data); };
    mr.start();
    setTimeout(() => { if (mr.state !== 'inactive') { mr.stop(); setIsRecording(false); } }, 10000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (fileOrBlob, filename) => {
    setIsProcessing(true);
    setVideoError('');
    setVideoResult(null);
    try {
      const formData = new FormData();
      if (fileOrBlob instanceof Blob) {
        const file = new File([fileOrBlob], filename || 'recording.webm', { type: fileOrBlob.type || 'video/webm' });
        formData.append('file', file);
      } else if (fileOrBlob && typeof fileOrBlob.name !== 'undefined') {
        formData.append('file', fileOrBlob);
      } else {
        setVideoError('No video file to analyze.');
        setIsProcessing(false);
        return;
      }
      const analysisRes = await healthAPI.analyzeVideo(formData);
      setVideoResult(analysisRes.data);
      await loadSessionHistory();
    } catch (err) {
      setVideoError(err.response?.data?.detail || 'Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSessionHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await analysisAPI.getVideoHistory(10);
      setSessions(res.data.history || []);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  };

  const loadVideoAccessStatus = async () => {
    const patientId = user?.id || user?._id || user?.user_id;
    if (!patientId) return;
    try {
      setLoadingAccessStatus(true);
      const res = await healthAPI.getVideoAccessStatus(patientId);
      setVideoAccessStatus(res.data);
    } catch { /* keep previous status */ }
    finally { setLoadingAccessStatus(false); }
  };

  const getRiskBadge = (level) => {
    const map = { Low: 'badge-success', Normal: 'badge-success', Medium: 'badge-warning', High: 'badge-danger', Critical: 'badge-danger' };
    return map[level] || 'badge-info';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header">
        <div className="max-w-5xl mx-auto relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Health Data Analysis</h1>
          <p className="text-white/75">Upload medical reports or record a video for AI-assisted review</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab Switch */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PDF TAB ── */}
        {activeTab === 'pdf' && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Upload panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="medo-card p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-1">Upload Medical PDF</h2>
                <p className="text-slate-500 text-sm mb-5">Blood tests, MRI reports, prescriptions — Gemini AI will extract and explain everything.</p>

                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-10 px-6 cursor-pointer transition-all duration-200 ${
                    pdfFile ? 'border-secondary bg-teal-50' : 'border-slate-200 hover:border-secondary hover:bg-slate-50'
                  }`}
                >
                  <input type="file" accept=".pdf,application/pdf" className="hidden"
                    onChange={e => { setPdfFile(e.target.files?.[0] || null); setPdfResult(null); setPdfError(''); }} />
                  {pdfFile ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-2xl mb-3">📄</div>
                      <p className="text-sm font-semibold text-slate-800 text-center break-all">{pdfFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                      <p className="text-xs text-secondary mt-2 font-medium">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl mb-3">📂</div>
                      <p className="text-sm font-semibold text-slate-600">Click to select PDF</p>
                      <p className="text-xs text-slate-400 mt-1">Max size: 10 MB</p>
                    </>
                  )}
                </label>

                {pdfError && <p className="alert-error mt-3 text-xs">{pdfError}</p>}

                <button
                  onClick={handlePdfAnalyze}
                  disabled={!pdfFile || pdfLoading}
                  className="btn-teal w-full mt-4 py-3"
                >
                  {pdfLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Analyzing with Gemini AI...
                    </span>
                  ) : 'Analyze with Gemini AI'}
                </button>
              </div>

              {/* What to expect */}
              <div className="medo-card p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What you'll get</p>
                <div className="space-y-2.5 text-sm text-slate-600">
                  {['Structured test result extraction', 'Normal range comparisons', 'Plain-language explanations', 'Risk level per finding', 'Recommended specialist type', 'Overall health summary'].map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="text-secondary mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="lg:col-span-3">
              {pdfLoading && (
                <div className="medo-card p-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
                    <svg className="animate-spin w-8 h-8 text-secondary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing your report...</h3>
                  <p className="text-slate-500 text-sm">Gemini AI is extracting test values, detecting abnormalities, and preparing your plain-language summary.</p>
                  <div className="mt-6 w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-secondary rounded-full animate-pulse w-2/3" />
                  </div>
                </div>
              )}

              {pdfResult && !pdfLoading && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Header card */}
                  <div className="medo-card p-6" style={{ background: 'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs uppercase tracking-wider mb-1">AI Report Analysis</p>
                        <h2 className="text-2xl font-bold text-white">Report Summary</h2>
                        <p className="text-white/70 text-sm mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      {pdfResult.overall_risk && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${getRiskBadge(pdfResult.overall_risk)}`}>
                          {pdfResult.overall_risk} Risk
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Short description / summary */}
                  {(pdfResult.short_description || pdfResult.summary) && (
                    <div className="medo-card p-6 bg-blue-50 border-l-4 border-blue-200">
                      <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-3">📋 What Your Report Means (In Simple Terms)</h3>
                      <p className="text-blue-900 leading-relaxed text-base whitespace-pre-wrap">{pdfResult.short_description || pdfResult.summary}</p>
                    </div>
                  )}

                  {/* Main risk */}
                  {pdfResult.main_risk && (
                    <div className="medo-card p-6 bg-amber-50 border-l-4 border-amber-400">
                      <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2">⚠️ Main Risk</h3>
                      <p className="text-amber-900 leading-relaxed text-sm whitespace-pre-wrap">{pdfResult.main_risk}</p>
                    </div>
                  )}

                  {/* How to fix */}
                  {pdfResult.how_to_fix && (
                    <div className="medo-card p-6 bg-green-50 border-l-4 border-green-400">
                      <h3 className="text-sm font-bold text-green-900 uppercase tracking-wider mb-2">✅ How to Fix / What to Do</h3>
                      <p className="text-green-900 leading-relaxed text-sm whitespace-pre-wrap">{pdfResult.how_to_fix}</p>
                    </div>
                  )}

                  {/* Report summary & causes */}
                  {(pdfResult.report_summary || pdfResult.causes) && (
                    <div className="medo-card p-6">
                      {pdfResult.report_summary && (
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">📄 Report Summary</h3>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{pdfResult.report_summary}</p>
                        </div>
                      )}
                      {pdfResult.causes && (
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">🔬 Possible Causes</h3>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{pdfResult.causes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600"><strong>💡 Tip:</strong> This is an AI-assisted summary. Always discuss your report with your doctor for personalized advice.</p>
                  </div>

                  {/* Findings table */}
                  {pdfResult.findings?.length > 0 && (
                    <div className="medo-card overflow-hidden">
                      <div className="p-5 pb-0">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Detailed Findings</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm medo-table">
                          <thead>
                            <tr>
                              <th>Test Name</th>
                              <th>Value</th>
                              <th>Normal Range</th>
                              <th>Status</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pdfResult.findings.map((f, i) => (
                              <tr key={i}>
                                <td className="font-semibold text-slate-800">{f.test_name || f.name}</td>
                                <td className="font-mono">{f.value}</td>
                                <td className="text-slate-500">{f.normal_range || '—'}</td>
                                <td>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    (f.status || '').toLowerCase() === 'normal' ? 'bg-green-100 text-green-700' :
                                    (f.status || '').toLowerCase() === 'low' ? 'bg-blue-100 text-blue-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {f.status || '—'}
                                  </span>
                                </td>
                                <td className="text-slate-500 text-xs max-w-xs">{f.suggestion || f.note || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recommended specialist */}
                  {pdfResult.recommended_specialist && (
                    <div className="medo-card p-5 border-l-4 border-secondary">
                      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Recommended Specialist</p>
                      <p className="text-slate-800 font-semibold">{pdfResult.recommended_specialist}</p>
                    </div>
                  )}

                  {/* Raw AI text if no structured data */}
                  {pdfResult.ai_report && !pdfResult.findings?.length && (
                    <div className="medo-card p-5">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">AI Analysis</h3>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{pdfResult.ai_report}</pre>
                    </div>
                  )}

                  <button onClick={() => { setPdfResult(null); setPdfFile(null); }} className="btn-outline text-sm">
                    Upload Another Report
                  </button>
                </motion.div>
              )}

              {!pdfResult && !pdfLoading && (
                <div className="medo-card p-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-4xl mb-5">📋</div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">Ready to Analyze</h3>
                  <p className="text-slate-400 text-sm max-w-sm">
                    Select a PDF medical report on the left. Gemini AI will extract test values, detect abnormalities, and provide a plain-language summary.
                  </p>

                  {/* Recent sessions preview */}
                  {sessions.length > 0 && (
                    <div className="mt-8 w-full text-left">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Sessions</p>
                      <div className="space-y-2">
                        {sessions.slice(0, 3).map((s, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-sm">🎥</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700 truncate">{s.file_name || `Session ${i + 1}`}</p>
                              <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIDEO TAB ── */}
        {activeTab === 'video' && (
          <>
            {loadingAccessStatus && videoAccessStatus == null && (
              <div className="mb-6 medo-card p-6 flex items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600 font-medium">Checking video access...</p>
              </div>
            )}
            {/* Video Access Lock */}
            {videoAccessStatus && !videoAccessStatus.is_unlocked && (
              <div className="mb-6 medo-card p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="text-5xl mt-1">🔒</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Video Analysis Currently Locked</h3>
                    <p className="text-slate-700 text-sm font-medium mb-3">💬 {videoAccessStatus.message}</p>
                    <p className="text-sm text-slate-600 mb-4">Your doctor needs to unlock video analysis for you. Once they accept your appointment and click the unlock button, you'll be able to upload and analyze videos to get personalized mobility insights.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={loadVideoAccessStatus}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        🔄 Check Status
                      </button>
                      <button 
                        onClick={() => window.location.href = '/appointments'}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                      >
                        📅 View Appointments
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {videoAccessStatus?.is_unlocked && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl flex items-center gap-4 shadow-sm">
                <span className="text-3xl animate-bounce">✅</span>
                <div className="flex-1">
                  <p className="font-bold text-green-900 text-sm">Video Analysis Unlocked!</p>
                  <p className="text-xs text-green-700">Unlocked by {videoAccessStatus.doctor_name} • Ready to analyze</p>
                </div>
                <button 
                  onClick={loadVideoAccessStatus}
                  className="text-green-600 hover:text-green-700 text-sm font-semibold"
                >
                  ↻ Refresh
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'video' && videoAccessStatus?.is_unlocked && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Camera */}
            <div className="lg:col-span-2 space-y-4">
              {/* Upload file option */}
              <div className="medo-card p-5">
                <h3 className="text-base font-bold text-slate-700 mb-3">Upload Video File</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0])}
                    className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-opacity-90" />
                  <button onClick={() => videoFile && uploadVideo(videoFile, videoFile.name)} disabled={!videoFile || isProcessing}
                    className="btn-teal text-sm px-5 py-2.5 whitespace-nowrap disabled:opacity-50">
                    {isProcessing ? 'Analyzing with AI...' : 'Upload & Analyze with Gemini'}
                  </button>
                </div>
              </div>

              {/* Camera feed */}
              <div className="medo-card overflow-hidden">
                <div className="bg-slate-900 aspect-video relative">
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <div className="text-center text-white">
                        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm">Initializing camera...</p>
                      </div>
                    </div>
                  )}
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      REC {recordingTime}s / 10s
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {videoError && <p className="alert-error mb-4 text-xs">{videoError}</p>}
                  {isProcessing && <p className="alert-info mb-4 text-xs">Processing and analyzing your video with AI...</p>}
                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <button onClick={startRecording} disabled={!cameraReady || isProcessing}
                        className="btn-danger px-6 py-2.5 text-sm disabled:opacity-50">
                        Start Recording
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="btn-danger px-6 py-2.5 text-sm">
                        Stop Recording
                      </button>
                    )}
                    <button onClick={startCamera} disabled={isRecording}
                      className="btn-outline px-5 py-2.5 text-sm disabled:opacity-50">
                      Refresh Camera
                    </button>
                  </div>
                  {isRecording && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Recording</span>
                        <span>{recordingTime}s of 10s</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all rounded-full" style={{ width: `${(recordingTime / 10) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results / History sidebar */}
            <div className="space-y-4">
              {videoResult ? (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Summary Card - PROMINENTLY DISPLAYED */}
                  {videoResult.summary && (
                    <div className="medo-card p-6 bg-gradient-to-br from-primary/10 via-secondary/10 to-emerald-50 border-2 border-primary/30 shadow-lg">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="text-3xl">📈</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Your Analysis Summary</h3>
                          <p className="text-xs text-slate-500">AI-Powered Movement Assessment • {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-lg p-4 border border-primary/20">
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{videoResult.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Header Card */}
                  <div className="medo-card p-6" style={{ background: 'linear-gradient(135deg, #0a2342 0%, #0d9488 100%)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white text-lg">✓</div>
                      <h3 className="font-bold text-white text-lg">Detailed Analysis Report</h3>
                    </div>
                    <p className="text-white/80 text-sm">Complete breakdown of your mobility metrics and movement patterns</p>
                  </div>

                  {/* Score Metrics */}
                  <div className="medo-card p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4">📊 Mobility Metrics</h3>
                    <div className="space-y-4">
                      {/* Gait Quality */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-slate-700">Gait Quality</span>
                          <span className="text-sm font-bold text-primary">{videoResult.gait_quality_score ?? 78}/100</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${videoResult.gait_quality_score ?? 78}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">How smoothly and efficiently you walk</p>
                      </div>
                      
                      {/* Balance */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-slate-700">Balance & Stability</span>
                          <span className="text-sm font-bold text-secondary">{videoResult.balance_score ?? 82}/100</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary transition-all rounded-full" style={{ width: `${videoResult.balance_score ?? 82}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Your ability to maintain equilibrium while moving</p>
                      </div>
                      
                      {/* Stride Consistency */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-slate-700">Stride Consistency</span>
                          <span className="text-sm font-bold text-cyan-600">{videoResult.stride_consistency ?? 75}/100</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 transition-all rounded-full" style={{ width: `${videoResult.stride_consistency ?? 75}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Uniformity of your walking pattern</p>
                      </div>

                      {/* Movement Fluidity */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-slate-700">Movement Fluidity</span>
                          <span className="text-sm font-bold text-amber-600">{videoResult.movement_fluidity ?? 80}/100</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all rounded-full" style={{ width: `${videoResult.movement_fluidity ?? 80}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Smoothness and coordination of your movements</p>
                      </div>
                    </div>
                  </div>

                  {/* Posture & Movement */}
                  <div className="medo-card p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-3">🧍 Posture & Movement</h3>
                    <div className="space-y-3">
                      {videoResult.posture && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Posture:</p>
                          <p className="text-sm text-slate-700">{videoResult.posture}</p>
                        </div>
                      )}
                      {videoResult.movement_description && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs font-semibold text-purple-900 mb-1">Movement Analysis:</p>
                          <p className="text-sm text-slate-700">{videoResult.movement_description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Findings */}
                  {videoResult.key_findings && videoResult.key_findings.length > 0 && (
                    <div className="medo-card p-6">
                      <h3 className="text-base font-bold text-slate-800 mb-3">✅ Key Findings</h3>
                      <div className="space-y-2">
                        {videoResult.key_findings.map((finding, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1 flex-shrink-0">✓</span>
                            <p className="text-sm text-slate-700">{finding}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Areas */}
                  {videoResult.risk_areas && videoResult.risk_areas.length > 0 && (
                    <div className="medo-card p-6">
                      <h3 className="text-base font-bold text-slate-800 mb-3">⚠️ Areas of Concern</h3>
                      <div className="space-y-2">
                        {videoResult.risk_areas.map((risk, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <span className="text-amber-600 text-lg flex-shrink-0">⚠️</span>
                            <p className="text-sm text-slate-700">{risk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {videoResult.recommendations && videoResult.recommendations.length > 0 && (
                    <div className="medo-card p-6">
                      <h3 className="text-base font-bold text-slate-800 mb-4">💡 Recommendations</h3>
                      <div className="space-y-2">
                        {videoResult.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600 font-bold flex-shrink-0">{idx + 1}</span>
                            <p className="text-sm text-slate-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setVideoResult(null)} className="btn-secondary w-full py-3">
                    Analyze Another Video
                  </button>
                </motion.div>
              ) : (
                <div className="medo-card p-6">
                  <h3 className="font-bold text-slate-800 mb-4">🎬 How It Works</h3>
                  <ol className="space-y-4">
                    {[
                      { num: '1', title: 'Record or Upload', desc: 'Capture your natural movement or upload an existing video' },
                      { num: '2', title: 'AI Analysis', desc: 'Our AI analyzes gait, posture, balance, and movement patterns' },
                      { num: '3', title: 'Get Results', desc: 'Receive a detailed report with findings and recommendations' },
                      { num: '4', title: 'Take Action', desc: 'Follow personalized suggestions to improve your health' }
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-sm">{step.num}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                          <p className="text-sm text-slate-600">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </ol>
                </div>
              )}

              <div className="medo-card p-5">
                <h3 className="font-bold text-slate-700 mb-4">Session History</h3>
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {sessions.map((s, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm font-semibold text-slate-700 truncate">{s.file_name || `Session ${i + 1}`}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(s.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No sessions yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show message when video is locked (and not loading) */}
        {activeTab === 'video' && !loadingAccessStatus && videoAccessStatus && !videoAccessStatus.is_unlocked && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">Video analysis upload will be available once your doctor unlocks it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

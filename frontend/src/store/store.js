import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('accessToken') || null,
  role: localStorage.getItem('userRole') || null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setRole: (role) => {
    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
    }
    set({ role });
  },
  setToken: (token) => {
    localStorage.setItem('accessToken', token);
    set({ token });
  },
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    set({ user: null, token: null, role: null });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const usePatientStore = create((set) => ({
  patient: null,
  trends: null,
  baselineStatus: null,
  riskHistory: null,
  isLoading: false,

  setPatient: (patient) => set({ patient }),
  setTrends: (trends) => set({ trends }),
  setBaselineStatus: (status) => set({ baselineStatus: status }),
  setRiskHistory: (history) => set({ riskHistory: history }),
  setLoading: (isLoading) => set({ isLoading }),
}));

export const useAnalysisStore = create((set) => ({
  currentSession: null,
  isRecording: false,
  frameCount: 0,
  videoDuration: 0,
  poseFrames: [],

  setCurrentSession: (session) => set({ currentSession: session }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setFrameCount: (count) => set({ frameCount: count }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setPoseFrames: (frames) => set({ poseFrames: frames }),
  clearSession: () => set({
    currentSession: null,
    frameCount: 0,
    videoDuration: 0,
    poseFrames: [],
  }),
}));

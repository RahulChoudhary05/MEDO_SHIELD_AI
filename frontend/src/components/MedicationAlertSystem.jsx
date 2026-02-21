import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { healthAPI } from '../services/api';
import { useAuthStore } from '../store/store';

export default function MedicationAlertSystem() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
    
    // Check for medication alerts every minute
    const intervalId = setInterval(() => {
      checkMedicationTime();
    }, 60000); // Check every minute

    // Initial check
    checkMedicationTime();

    return () => clearInterval(intervalId);
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const patientId = user?.id || user?._id || user?.user_id;
      const response = await healthAPI.getMedicationSchedule(patientId);
      setSchedule(response.data.daily_schedule || {});
      setLoading(false);
    } catch (err) {
      console.error('Failed to load medication schedule:', err);
      setLoading(false);
    }
  };

  const checkMedicationTime = () => {
    if (!schedule || Object.keys(schedule).length === 0) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Check if current time matches any scheduled medication time
    Object.entries(schedule).forEach(([timeSlot, medications]) => {
      // Check if time matches (within 1 minute window)
      if (timeSlot === currentTime || isWithinTimeWindow(currentTime, timeSlot, 1)) {
        medications.forEach(medication => {
          // Check if alert already shown in last 5 minutes
          const alreadyShown = alerts.some(
            alert => alert.medication === medication && 
            alert.timeSlot === timeSlot &&
            (Date.now() - alert.timestamp) < 5 * 60 * 1000
          );

          if (!alreadyShown) {
            showAlert(medication, timeSlot);
          }
        });
      }
    });
  };

  const isWithinTimeWindow = (currentTime, scheduledTime, windowMinutes) => {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [scheduledHour, scheduledMin] = scheduledTime.split(':').map(Number);
    
    const currentTotalMins = currentHour * 60 + currentMin;
    const scheduledTotalMins = scheduledHour * 60 + scheduledMin;
    
    const diff = Math.abs(currentTotalMins - scheduledTotalMins);
    return diff <= windowMinutes;
  };

  const showAlert = async (medication, timeSlot) => {
    const newAlert = {
      id: Date.now(),
      medication,
      timeSlot,
      timestamp: Date.now()
    };

    setAlerts(prev => [...prev, newAlert]);
    setCurrentAlert(newAlert);

    // Send notification to backend
    try {
      const patientId = user?.id || user?._id || user?.user_id;
      await healthAPI.sendMedicationAlert(patientId, medication, timeSlot);
    } catch (err) {
      console.error('Failed to send medication alert:', err);
    }

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      dismissAlert(newAlert.id);
    }, 30000);

    // Play alert sound
    playAlertSound();
  };

  const playAlertSound = () => {
    // Create a simple beep sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.warn('Audio not supported');
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (currentAlert?.id === alertId) {
      setCurrentAlert(null);
    }
  };

  const markAsTaken = async (alertId, medication) => {
    try {
      const patientId = user?.id || user?._id || user?.user_id;
      await healthAPI.recordMedicationTaken(patientId, medication);
      dismissAlert(alertId);
    } catch (err) {
      console.error('Failed to record medication:', err);
    }
  };

  const snoozeAlert = (alertId, minutes = 5) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    dismissAlert(alertId);

    setTimeout(() => {
      setCurrentAlert(alert);
      setAlerts(prev => [...prev, { ...alert, timestamp: Date.now() }]);
    }, minutes * 60 * 1000);
  };

  return (
    <>
      {/* Floating Alert Display */}
      <AnimatePresence>
        {currentAlert && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            className="fixed top-4 right-4 z-50 max-w-md"
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-2xl overflow-hidden border-4 border-white">
              {/* Alert Header */}
              <div className="bg-yellow-400 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1,
                      repeatDelay: 0.5
                    }}
                    className="text-3xl"
                  >
                    ⏰
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Medication Reminder</h3>
                    <p className="text-sm text-gray-700">Time: {currentAlert.timeSlot}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => dismissAlert(currentAlert.id)}
                  className="text-gray-900 text-2xl font-bold hover:bg-gray-200 w-8 h-8 rounded-full"
                >
                  ×
                </motion.button>
              </div>

              {/* Alert Body */}
              <div className="p-6 text-white">
                <div className="flex items-center space-x-4 mb-6">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2
                    }}
                    className="text-6xl"
                  >
                    💊
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{currentAlert.medication}</h2>
                    <p className="text-blue-100">Please take your medication now</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => markAsTaken(currentAlert.id, currentAlert.medication)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                  >
                    <span>✓</span>
                    <span>Taken</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => snoozeAlert(currentAlert.id, 5)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                  >
                    <span>⏰</span>
                    <span>Snooze 5m</span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => snoozeAlert(currentAlert.id, 15)}
                  className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                >
                  <span>⏰</span>
                  <span>Snooze 15 minutes</span>
                </motion.button>

                <button
                  onClick={() => dismissAlert(currentAlert.id)}
                  className="w-full mt-3 text-white/70 hover:text-white text-sm underline"
                >
                  Dismiss
                </button>
              </div>

              {/* Progress Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
                className="h-1 bg-yellow-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert History Indicator (Bottom Right) */}
      {alerts.length > 0 && !currentAlert && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 z-40"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (alerts.length > 0) {
                setCurrentAlert(alerts[alerts.length - 1]);
              }
            }}
            className="bg-blue-600 text-white rounded-full p-4 shadow-lg relative"
          >
            <span className="text-2xl">💊</span>
            {alerts.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </motion.button>
        </motion.div>
      )}
    </>
  );
}

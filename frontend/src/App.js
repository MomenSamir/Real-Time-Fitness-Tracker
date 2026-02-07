import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import './App.css';

Chart.register(...registerables);

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState('');
  
  // Data states
  const [goals, setGoals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [todayLog, setTodayLog] = useState({});
  const [stats, setStats] = useState({});
  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [nextReminder, setNextReminder] = useState(null);
  const [timeUntilReminder, setTimeUntilReminder] = useState(null);
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const audioRef = useRef(null);
  
  // Form states
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    workout_type: 'cardio',
    workout_name: '',
    duration_minutes: '',
    calories_burned: '',
    intensity: 'medium',
    workout_date: new Date().toISOString().split('T')[0],
    workout_time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });
  const [goalForm, setGoalForm] = useState({
    goal_type: 'weight_loss',
    target_value: '',
    current_value: '',
    deadline: ''
  });

  // Chart refs
  const caloriesChartRef = useRef(null);
  const caloriesChartInstance = useRef(null);
  const weightChartRef = useRef(null);
  const weightChartInstance = useRef(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('workout_created', (workout) => {
      setWorkouts(prev => [workout, ...prev]);
      showNotification(`🏋️ Workout logged: ${workout.workout_name} - ${workout.calories_burned} cal`);
      fetchAllData();
    });

    socket.on('workout_deleted', (data) => {
      setWorkouts(prev => prev.filter(w => w.id !== data.id));
      fetchAllData();
    });

    socket.on('log_updated', (log) => {
      setLogs(prev => prev.map(l => l.log_date === log.log_date ? log : l));
      if (log.log_date === new Date().toISOString().split('T')[0]) {
        setTodayLog(log);
      }
      showNotification('📊 Daily log updated!');
      fetchAllData();
    });

    socket.on('goal_created', (goal) => {
      setGoals(prev => [goal, ...prev]);
      showNotification(`🎯 New goal created!`);
    });

    socket.on('goal_updated', (goal) => {
      setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
      showNotification(`✅ Goal updated!`);
    });

    socket.on('goal_deleted', (data) => {
      setGoals(prev => prev.filter(g => g.id !== data.id));
    });

    return () => {
      socket.off('workout_created');
      socket.off('workout_deleted');
      socket.off('log_updated');
      socket.off('goal_created');
      socket.off('goal_updated');
      socket.off('goal_deleted');
    };
  }, [socket]);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchGoals(),
        fetchWorkouts(),
        fetchLogs(),
        fetchTodayLog(),
        fetchStats(),
        fetchReminders()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await axios.get(`${API_URL}/reminders`);
      setReminders(response.data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Real-time countdown for next reminder
  useEffect(() => {
    const updateCountdown = () => {
      if (reminders.length === 0) return;
      
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Find upcoming reminders within next 10 minutes
      const upcomingReminders = reminders
        .filter(r => r.is_active)
        .map(r => {
          const [hours, minutes] = r.reminder_time.split(':');
          const reminderMinutes = parseInt(hours) * 60 + parseInt(minutes);
          
          let minutesUntil = reminderMinutes - currentMinutes;
          
          // Handle day rollover (reminder tomorrow)
          if (minutesUntil < 0) {
            minutesUntil += 24 * 60;
          }
          
          return {
            ...r,
            minutesUntil
          };
        })
        .filter(r => r.minutesUntil <= 10) // Only show if within 10 minutes
        .sort((a, b) => a.minutesUntil - b.minutesUntil);
      
      if (upcomingReminders.length > 0) {
        const closest = upcomingReminders[0];
        setNextReminder(closest);
        setTimeUntilReminder(closest.minutesUntil);
        
        // If time is up (0 minutes), trigger alarm
        if (closest.minutesUntil === 0 && now.getSeconds() === 0) {
          checkAndTriggerAlarm(closest);
        }
      } else {
        setNextReminder(null);
        setTimeUntilReminder(null);
      }
    };

    // Update every second for real-time countdown
    const interval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Run immediately
    
    return () => clearInterval(interval);
  }, [reminders, todayLog, workouts]);

  const checkAndTriggerAlarm = (reminder) => {
    const today = new Date().toISOString().split('T')[0];
    
    let isLogged = false;
    
    switch(reminder.activity_type) {
      case 'weight':
        isLogged = todayLog.weight_kg != null;
        break;
      case 'water':
        isLogged = todayLog.water_ml > 0;
        break;
      case 'sleep':
        isLogged = todayLog.sleep_hours != null;
        break;
      case 'workout':
        isLogged = workouts.some(w => w.workout_date === today);
        break;
      default:
        break;
    }
    
    if (!isLogged) {
      triggerAlarm(reminder);
    }
  };

  const triggerAlarm = (reminder) => {
    setCurrentAlarm(reminder);
    setShowAlarm(true);
    
    // Play alarm sound
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ Fitness Tracker Alert!', {
        body: reminder.message || `Time to log your ${reminder.activity_type}!`,
        icon: '💪',
        tag: 'fitness-reminder',
        requireInteraction: true
      });
    }
  };

  const dismissAlarm = () => {
    setShowAlarm(false);
    setCurrentAlarm(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${API_URL}/goals`);
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchWorkouts = async () => {
    try {
      const response = await axios.get(`${API_URL}/workouts`);
      setWorkouts(response.data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchTodayLog = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs/today`);
      setTodayLog(response.data);
    } catch (error) {
      console.error('Error fetching today log:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Update calories chart
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await axios.get(`${API_URL}/workouts/chart`);
        updateCaloriesChart(response.data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };
    fetchChartData();
  }, [workouts]);

  // Update weight chart
  useEffect(() => {
    updateWeightChart();
  }, [logs]);

  const updateCaloriesChart = (data) => {
    if (!caloriesChartRef.current) return;

    if (caloriesChartInstance.current) {
      caloriesChartInstance.current.destroy();
    }

    const ctx = caloriesChartRef.current.getContext('2d');
    
    caloriesChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => new Date(d.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Calories Burned',
          data: data.map(d => d.total_calories),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: '🔥 Calories Burned (Last 30 Days)',
            font: { size: 18, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => value + ' cal' }
          }
        }
      }
    });
  };

  const updateWeightChart = () => {
    if (!weightChartRef.current || logs.length === 0) return;

    if (weightChartInstance.current) {
      weightChartInstance.current.destroy();
    }

    const ctx = weightChartRef.current.getContext('2d');
    const weightLogs = logs.filter(l => l.weight_kg).slice(0, 14).reverse();
    
    weightChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weightLogs.map(l => new Date(l.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Weight (kg)',
          data: weightLogs.map(l => parseFloat(l.weight_kg)),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: '⚖️ Weight Progress',
            font: { size: 18, weight: 'bold' }
          }
        },
        scales: {
          y: {
            ticks: { callback: (value) => value + ' kg' }
          }
        }
      }
    });
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/workouts`, workoutForm);
      setShowWorkoutForm(false);
      setWorkoutForm({
        workout_type: 'cardio',
        workout_name: '',
        duration_minutes: '',
        calories_burned: '',
        intensity: 'medium',
        workout_date: new Date().toISOString().split('T')[0],
        workout_time: new Date().toTimeString().slice(0, 5),
        notes: ''
      });
    } catch (error) {
      console.error('Error creating workout:', error);
    }
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/goals`, goalForm);
      setShowGoalForm(false);
      setGoalForm({
        goal_type: 'weight_loss',
        target_value: '',
        current_value: '',
        deadline: ''
      });
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleTodayLogUpdate = async (field, value) => {
    try {
      const updatedLog = { ...todayLog, [field]: value };
      await axios.put(`${API_URL}/logs/${new Date().toISOString().split('T')[0]}`, updatedLog);
      setTodayLog(updatedLog);
    } catch (error) {
      console.error('Error updating today log:', error);
    }
  };

  const deleteWorkout = async (id) => {
    if (!window.confirm('Delete this workout?')) return;
    try {
      await axios.delete(`${API_URL}/workouts/${id}`);
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const getProgressPercentage = (goal) => {
    if (goal.goal_type.includes('weight_loss')) {
      const progress = ((goal.current_value - goal.target_value) / (goal.current_value - goal.target_value)) * 100;
      return Math.max(0, Math.min(100, 100 - progress));
    }
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  return (
    <div className="App">
      {/* Alarm Audio */}
      <audio ref={audioRef} loop>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTgIGWi77eefTRAMUKfj8LZjHAU4ktbyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQYtgsrz2Ik4CBhov+3nn00QDFCn4/C2YxwFOJLW8sx5LAUkd8fw3ZBACRRM=" type="audio/wav" />
      </audio>

      {notification && <div className="notification">{notification}</div>}

      {/* Full-Screen Alarm Modal */}
      {showAlarm && currentAlarm && (
        <div className="alarm-overlay">
          <div className="alarm-modal">
            <div className="alarm-icon">⏰</div>
            <h1 className="alarm-title">TIME'S UP!</h1>
            <h2 className="alarm-activity">{currentAlarm.activity_type.toUpperCase()}</h2>
            <p className="alarm-message">{currentAlarm.message}</p>
            <button className="alarm-dismiss" onClick={dismissAlarm}>
              ✓ Got it! I'll log now
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <h1>💪 My Fitness Tracker</h1>
        <div className="header-actions">
          {nextReminder && timeUntilReminder !== null && (
            <div className="countdown-widget">
              <div className="countdown-icon">
                {nextReminder.activity_type === 'weight' && '⚖️'}
                {nextReminder.activity_type === 'workout' && '🏋️'}
                {nextReminder.activity_type === 'water' && '💧'}
                {nextReminder.activity_type === 'sleep' && '😴'}
              </div>
              <div className="countdown-info">
                <div className="countdown-label">{nextReminder.activity_type}</div>
                <div className="countdown-time">
                  {timeUntilReminder === 0 ? (
                    <span className="countdown-now">NOW!</span>
                  ) : (
                    <>
                      <span className="countdown-number">{timeUntilReminder}</span>
                      <span className="countdown-unit">min</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <button className="btn-reminders" onClick={() => setShowReminders(true)}>
            ⏰ Reminders
          </button>
          <div className="connection-status">
            {socket?.connected ? '🟢 Live' : '🔴 Offline'}
          </div>
        </div>
      </header>

      <div className="container">
        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <h3>Current Weight</h3>
            <p className="stat-value">{todayLog.weight_kg || '--'} kg</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <h3>This Week</h3>
            <p className="stat-value">{stats.this_week?.total_calories || 0} cal</p>
            <p className="stat-subtitle">{stats.this_week?.count || 0} workouts</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚶</div>
            <h3>Today's Steps</h3>
            <p className="stat-value">{todayLog.steps || 0}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💧</div>
            <h3>Water Today</h3>
            <p className="stat-value">{todayLog.water_ml || 0} ml</p>
          </div>
        </div>

        {/* Today's Quick Log */}
        <div className="today-log-section">
          <h2>📝 Today's Log</h2>
          <div className="quick-log-grid">
            <div className="quick-log-item">
              <label>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={todayLog.weight_kg || ''}
                onChange={(e) => handleTodayLogUpdate('weight_kg', e.target.value)}
                placeholder="75.5"
              />
            </div>
            <div className="quick-log-item">
              <label>Steps</label>
              <input
                type="number"
                value={todayLog.steps || ''}
                onChange={(e) => handleTodayLogUpdate('steps', e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="quick-log-item">
              <label>Water (ml)</label>
              <input
                type="number"
                value={todayLog.water_ml || ''}
                onChange={(e) => handleTodayLogUpdate('water_ml', e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="quick-log-item">
              <label>Sleep (hours)</label>
              <input
                type="number"
                step="0.5"
                value={todayLog.sleep_hours || ''}
                onChange={(e) => handleTodayLogUpdate('sleep_hours', e.target.value)}
                placeholder="7.5"
              />
            </div>
            <div className="quick-log-item">
              <label>Mood</label>
              <select
                value={todayLog.mood || 'good'}
                onChange={(e) => handleTodayLogUpdate('mood', e.target.value)}
              >
                <option value="great">😄 Great</option>
                <option value="good">😊 Good</option>
                <option value="okay">😐 Okay</option>
                <option value="bad">😞 Bad</option>
                <option value="terrible">😢 Terrible</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-section">
          <div className="chart-container">
            <canvas ref={caloriesChartRef}></canvas>
          </div>
          <div className="chart-container">
            <canvas ref={weightChartRef}></canvas>
          </div>
        </div>

        {/* Goals */}
        <div className="goals-section">
          <div className="section-header">
            <h2>🎯 My Goals</h2>
            <button className="btn-primary" onClick={() => setShowGoalForm(true)}>
              + Add Goal
            </button>
          </div>
          <div className="goals-grid">
            {goals.map(goal => (
              <div key={goal.id} className="goal-card">
                <h3>{goal.goal_type.replace(/_/g, ' ').toUpperCase()}</h3>
                <div className="goal-values">
                  <span className="current">{goal.current_value}</span>
                  <span className="separator">/</span>
                  <span className="target">{goal.target_value}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${getProgressPercentage(goal)}%` }}
                  ></div>
                </div>
                <div className="goal-footer">
                  <span className="status">{goal.status}</span>
                  {goal.deadline && (
                    <span className="deadline">
                      📅 {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workouts */}
        <div className="workouts-section">
          <div className="section-header">
            <h2>🏋️ Recent Workouts</h2>
            <button className="btn-primary" onClick={() => setShowWorkoutForm(true)}>
              + Log Workout
            </button>
          </div>
          <div className="workouts-list">
            {workouts.slice(0, 10).map(workout => (
              <div key={workout.id} className="workout-card">
                <div className="workout-header">
                  <h3>{workout.workout_name}</h3>
                  <button className="btn-delete" onClick={() => deleteWorkout(workout.id)}>
                    ✕
                  </button>
                </div>
                <div className="workout-details">
                  <span className="badge">{workout.workout_type}</span>
                  <span>⏱️ {workout.duration_minutes} min</span>
                  <span>🔥 {workout.calories_burned} cal</span>
                  {workout.workout_time && <span>🕐 {workout.workout_time.slice(0, 5)}</span>}
                  <span>📅 {new Date(workout.workout_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workout Form Modal */}
        {showWorkoutForm && (
          <div className="modal-overlay" onClick={() => setShowWorkoutForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Log Workout</h2>
              <form onSubmit={handleWorkoutSubmit}>
                <select
                  value={workoutForm.workout_type}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, workout_type: e.target.value })}
                >
                  <option value="cardio">Cardio</option>
                  <option value="strength">Strength</option>
                  <option value="yoga">Yoga</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Workout Name *"
                  value={workoutForm.workout_name}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, workout_name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Duration (minutes) *"
                  value={workoutForm.duration_minutes}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Calories Burned *"
                  value={workoutForm.calories_burned}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                  required
                />
                <select
                  value={workoutForm.intensity}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, intensity: e.target.value })}
                >
                  <option value="low">Low Intensity</option>
                  <option value="medium">Medium Intensity</option>
                  <option value="high">High Intensity</option>
                </select>
                <input
                  type="date"
                  value={workoutForm.workout_date}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, workout_date: e.target.value })}
                />
                <input
                  type="time"
                  value={workoutForm.workout_time}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, workout_time: e.target.value })}
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={workoutForm.notes}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                  rows="3"
                />
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Save Workout</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowWorkoutForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Goal Form Modal */}
        {showGoalForm && (
          <div className="modal-overlay" onClick={() => setShowGoalForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Create Goal</h2>
              <form onSubmit={handleGoalSubmit}>
                <select
                  value={goalForm.goal_type}
                  onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value })}
                >
                  <option value="weight_loss">Weight Loss</option>
                  <option value="weight_gain">Weight Gain</option>
                  <option value="workouts_per_week">Workouts Per Week</option>
                  <option value="calories_per_week">Calories Per Week</option>
                  <option value="steps_per_day">Steps Per Day</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Target Value *"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                  required
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Current Value *"
                  value={goalForm.current_value}
                  onChange={(e) => setGoalForm({ ...goalForm, current_value: e.target.value })}
                  required
                />
                <input
                  type="date"
                  placeholder="Deadline"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                />
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Create Goal</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowGoalForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Reminders Modal */}
        {showReminders && (
          <div className="modal-overlay" onClick={() => setShowReminders(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>⏰ Activity Reminders</h2>
              <p className="modal-subtitle">Get notified when it's time to log your activities</p>
              
              <div className="reminders-list">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="reminder-card">
                    <div className="reminder-header">
                      <span className="reminder-type">{reminder.activity_type.toUpperCase()}</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={reminder.is_active}
                          onChange={async (e) => {
                            try {
                              await axios.put(`${API_URL}/reminders/${reminder.id}`, {
                                ...reminder,
                                is_active: e.target.checked
                              });
                              fetchReminders();
                            } catch (error) {
                              console.error('Error updating reminder:', error);
                            }
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="reminder-time">
                      🕐 {reminder.reminder_time.slice(0, 5)}
                    </div>
                    <div className="reminder-message">
                      {reminder.message}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="reminder-note">
                <p>💡 <strong>Tip:</strong> Allow browser notifications for alerts even when the app is in the background!</p>
              </div>
              
              <button className="btn-primary" onClick={() => setShowReminders(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
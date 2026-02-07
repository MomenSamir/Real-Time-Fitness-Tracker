const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ========== GOALS ROUTES ==========

// Get all goals
app.get('/api/goals', async (req, res) => {
  try {
    const [goals] = await db.query('SELECT * FROM goals ORDER BY created_at DESC');
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create goal
app.post('/api/goals', async (req, res) => {
  try {
    const { goal_type, target_value, current_value, deadline } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO goals (goal_type, target_value, current_value, deadline) VALUES (?, ?, ?, ?)',
      [goal_type, target_value, current_value || 0, deadline]
    );

    const [newGoal] = await db.query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
    
    io.emit('goal_created', newGoal[0]);
    res.status(201).json(newGoal[0]);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update goal
app.put('/api/goals/:id', async (req, res) => {
  try {
    const { target_value, current_value, deadline, status } = req.body;
    const { id } = req.params;

    await db.query(
      'UPDATE goals SET target_value = ?, current_value = ?, deadline = ?, status = ? WHERE id = ?',
      [target_value, current_value, deadline, status, id]
    );

    const [updatedGoal] = await db.query('SELECT * FROM goals WHERE id = ?', [id]);
    
    io.emit('goal_updated', updatedGoal[0]);
    res.json(updatedGoal[0]);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete goal
app.delete('/api/goals/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM goals WHERE id = ?', [req.params.id]);
    
    io.emit('goal_deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ========== WORKOUTS ROUTES ==========

// Get all workouts
app.get('/api/workouts', async (req, res) => {
  try {
    const [workouts] = await db.query(`
      SELECT * FROM workouts 
      ORDER BY workout_date DESC, created_at DESC
      LIMIT 100
    `);
    res.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workouts for chart (last 30 days)
app.get('/api/workouts/chart', async (req, res) => {
  try {
    const [workouts] = await db.query(`
      SELECT 
        workout_date,
        SUM(calories_burned) as total_calories,
        SUM(duration_minutes) as total_duration,
        COUNT(*) as workout_count
      FROM workouts
      WHERE workout_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY workout_date
      ORDER BY workout_date ASC
    `);
    res.json(workouts);
  } catch (error) {
    console.error('Error fetching workout chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Create workout
app.post('/api/workouts', async (req, res) => {
  try {
    const { workout_type, workout_name, duration_minutes, calories_burned, intensity, workout_date, workout_time, notes } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO workouts (workout_type, workout_name, duration_minutes, calories_burned, intensity, workout_date, workout_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [workout_type, workout_name, duration_minutes, calories_burned, intensity, workout_date, workout_time, notes]
    );

    const [newWorkout] = await db.query('SELECT * FROM workouts WHERE id = ?', [result.insertId]);
    
    io.emit('workout_created', newWorkout[0]);
    res.status(201).json(newWorkout[0]);
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// ========== REMINDERS ROUTES ==========

// Get all reminders
app.get('/api/reminders', async (req, res) => {
  try {
    const [reminders] = await db.query('SELECT * FROM activity_reminders ORDER BY reminder_time');
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// Create reminder
app.post('/api/reminders', async (req, res) => {
  try {
    const { activity_type, reminder_time, message, days_of_week } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO activity_reminders (activity_type, reminder_time, message, days_of_week) VALUES (?, ?, ?, ?)',
      [activity_type, reminder_time, message, days_of_week || 'all']
    );

    const [newReminder] = await db.query('SELECT * FROM activity_reminders WHERE id = ?', [result.insertId]);
    
    io.emit('reminder_created', newReminder[0]);
    res.status(201).json(newReminder[0]);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// Update reminder
app.put('/api/reminders/:id', async (req, res) => {
  try {
    const { reminder_time, is_active, message } = req.body;
    const { id } = req.params;

    await db.query(
      'UPDATE activity_reminders SET reminder_time = ?, is_active = ?, message = ? WHERE id = ?',
      [reminder_time, is_active, message, id]
    );

    const [updatedReminder] = await db.query('SELECT * FROM activity_reminders WHERE id = ?', [id]);
    
    io.emit('reminder_updated', updatedReminder[0]);
    res.json(updatedReminder[0]);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// Delete reminder
app.delete('/api/reminders/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM activity_reminders WHERE id = ?', [req.params.id]);
    
    io.emit('reminder_deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// Delete workout
app.delete('/api/workouts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM workouts WHERE id = ?', [req.params.id]);
    
    io.emit('workout_deleted', { id: parseInt(req.params.id) });
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// ========== DAILY LOGS ROUTES ==========

// Get all daily logs
app.get('/api/logs', async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT * FROM daily_logs 
      ORDER BY log_date DESC
      LIMIT 30
    `);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get today's log
app.get('/api/logs/today', async (req, res) => {
  try {
    const [logs] = await db.query(
      'SELECT * FROM daily_logs WHERE log_date = CURDATE()'
    );
    
    if (logs.length === 0) {
      // Create today's log if it doesn't exist
      await db.query(
        'INSERT INTO daily_logs (log_date) VALUES (CURDATE())'
      );
      const [newLog] = await db.query(
        'SELECT * FROM daily_logs WHERE log_date = CURDATE()'
      );
      res.json(newLog[0]);
    } else {
      res.json(logs[0]);
    }
  } catch (error) {
    console.error('Error fetching today log:', error);
    res.status(500).json({ error: 'Failed to fetch today log' });
  }
});

// Update daily log
app.put('/api/logs/:date', async (req, res) => {
  try {
    const { weight_kg, steps, water_ml, sleep_hours, mood, notes } = req.body;
    const { date } = req.params;

    // Insert or update
    await db.query(`
      INSERT INTO daily_logs (log_date, weight_kg, steps, water_ml, sleep_hours, mood, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        weight_kg = ?,
        steps = ?,
        water_ml = ?,
        sleep_hours = ?,
        mood = ?,
        notes = ?
    `, [date, weight_kg, steps, water_ml, sleep_hours, mood, notes,
        weight_kg, steps, water_ml, sleep_hours, mood, notes]);

    const [updatedLog] = await db.query(
      'SELECT * FROM daily_logs WHERE log_date = ?',
      [date]
    );
    
    io.emit('log_updated', updatedLog[0]);
    res.json(updatedLog[0]);
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// ========== STATISTICS ROUTES ==========

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    // Today's stats
    const [todayLog] = await db.query(
      'SELECT * FROM daily_logs WHERE log_date = CURDATE()'
    );

    // This week's workouts
    const [weekWorkouts] = await db.query(`
      SELECT 
        COUNT(*) as count,
        SUM(calories_burned) as total_calories,
        SUM(duration_minutes) as total_minutes
      FROM workouts
      WHERE workout_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    // Active goals
    const [activeGoals] = await db.query(
      'SELECT COUNT(*) as count FROM goals WHERE status = "active"'
    );

    // Weight progress (last 7 days avg vs previous 7 days)
    const [weightProgress] = await db.query(`
      SELECT 
        AVG(CASE WHEN log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN weight_kg END) as recent_avg,
        AVG(CASE WHEN log_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND log_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN weight_kg END) as previous_avg
      FROM daily_logs
    `);

    // Streak calculation (consecutive days with workouts)
    const [streak] = await db.query(`
      SELECT COUNT(*) as streak
      FROM (
        SELECT workout_date
        FROM workouts
        WHERE workout_date <= CURDATE()
        GROUP BY workout_date
        ORDER BY workout_date DESC
      ) as recent_workouts
      WHERE workout_date >= DATE_SUB(CURDATE(), INTERVAL (
        SELECT COUNT(DISTINCT workout_date) - 1
        FROM workouts
        WHERE workout_date <= CURDATE()
        GROUP BY workout_date
        ORDER BY workout_date DESC
        LIMIT 100
      ) DAY)
    `);

    res.json({
      today: todayLog[0] || {},
      this_week: weekWorkouts[0],
      active_goals: activeGoals[0].count,
      weight_progress: weightProgress[0],
      workout_streak: streak[0]?.streak || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Fitness tracker server running on port ${PORT}`);
});
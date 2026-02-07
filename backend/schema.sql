-- Create database
CREATE DATABASE IF NOT EXISTS node-fitness-tracker;

USE node-fitness-tracker;

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_type ENUM('weight_loss', 'weight_gain', 'workouts_per_week', 'calories_per_week', 'steps_per_day') NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2) DEFAULT 0,
  deadline DATE,
  status ENUM('active', 'completed', 'failed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workout_type ENUM('cardio', 'strength', 'yoga', 'sports', 'other') NOT NULL,
  workout_name VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL,
  calories_burned INT NOT NULL,
  intensity ENUM('low', 'medium', 'high') DEFAULT 'medium',
  workout_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily logs table (weight, steps, water, sleep)
CREATE TABLE IF NOT EXISTS daily_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_date DATE NOT NULL UNIQUE,
  weight_kg DECIMAL(5, 2),
  steps INT DEFAULT 0,
  water_ml INT DEFAULT 0,
  sleep_hours DECIMAL(3, 1),
  mood ENUM('great', 'good', 'okay', 'bad', 'terrible'),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Exercise details table (for strength training)
CREATE TABLE IF NOT EXISTS exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workout_id INT NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  sets INT,
  reps INT,
  weight_kg DECIMAL(5, 2),
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

-- Insert sample goals
INSERT INTO goals (goal_type, target_value, current_value, deadline, status) VALUES
('weight_loss', 75.0, 82.0, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'active'),
('workouts_per_week', 5.0, 3.0, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active'),
('calories_per_week', 3000.0, 1800.0, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'active');

-- Insert sample workouts (last 14 days)
INSERT INTO workouts (workout_type, workout_name, duration_minutes, calories_burned, intensity, workout_date) VALUES
('cardio', 'Morning Run', 30, 300, 'high', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
('strength', 'Upper Body Workout', 45, 250, 'high', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
('cardio', 'Evening Cycling', 40, 350, 'medium', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
('yoga', 'Yoga Flow', 60, 180, 'low', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
('cardio', 'HIIT Training', 25, 400, 'high', DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
('strength', 'Leg Day', 50, 280, 'high', DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
('cardio', 'Swimming', 45, 420, 'medium', DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
('sports', 'Basketball', 60, 450, 'high', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
('cardio', 'Morning Run', 35, 320, 'medium', DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
('strength', 'Full Body', 55, 300, 'high', DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
('yoga', 'Stretching Session', 30, 100, 'low', DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
('cardio', 'Treadmill', 40, 380, 'medium', DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
('strength', 'Core Workout', 30, 200, 'medium', DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
('cardio', 'Jump Rope', 20, 250, 'high', DATE_SUB(CURDATE(), INTERVAL 13 DAY));

-- Insert sample daily logs (last 14 days)
INSERT INTO daily_logs (log_date, weight_kg, steps, water_ml, sleep_hours, mood) VALUES
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 82.0, 12500, 2200, 7.5, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 82.2, 10800, 2000, 6.5, 'okay'),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 82.5, 8500, 1800, 8.0, 'great'),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 82.3, 11200, 2400, 7.0, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 82.8, 9800, 2100, 6.0, 'okay'),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 82.6, 13000, 2500, 7.5, 'great'),
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 83.0, 7500, 1600, 5.5, 'bad'),
(DATE_SUB(CURDATE(), INTERVAL 8 DAY), 83.2, 10500, 2200, 7.0, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 9 DAY), 83.1, 11800, 2300, 8.0, 'great'),
(DATE_SUB(CURDATE(), INTERVAL 10 DAY), 83.5, 9200, 1900, 6.5, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 11 DAY), 83.3, 10800, 2000, 7.5, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 12 DAY), 83.7, 8900, 1700, 6.0, 'okay'),
(DATE_SUB(CURDATE(), INTERVAL 13 DAY), 83.8, 9500, 2100, 7.0, 'good'),
(DATE_SUB(CURDATE(), INTERVAL 14 DAY), 84.0, 11200, 2200, 7.5, 'good');

-- Insert today's log
INSERT INTO daily_logs (log_date, weight_kg, steps, water_ml, sleep_hours, mood) VALUES
(CURDATE(), 81.8, 5000, 1000, 7.0, 'good')
ON DUPLICATE KEY UPDATE 
  weight_kg = 81.8,
  steps = 5000,
  water_ml = 1000,
  sleep_hours = 7.0,
  mood = 'good';


ALTER TABLE workouts ADD COLUMN workout_time TIME AFTER workout_date;

CREATE TABLE IF NOT EXISTS activity_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_type ENUM('workout', 'weight', 'water', 'sleep') NOT NULL,
  reminder_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  days_of_week VARCHAR(20) DEFAULT 'all',
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO activity_reminders (activity_type, reminder_time, message) VALUES
('weight', '07:00:00', 'Time to log your morning weight!'),
('workout', '18:00:00', 'Have you worked out today?'),
('water', '20:00:00', 'Did you drink enough water today?'),
('sleep', '22:00:00', 'Log your sleep hours from last night!');

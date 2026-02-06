# 💪 Personal Fitness Tracker

A real-time personal fitness tracking system built with Node.js, Express, Socket.IO, MySQL, React, and Chart.js.

## 🎯 Features

### Real-Time Updates
✨ **Live Data Sync** - Updates instantly across all devices when you log data
📊 **Auto-Updating Charts** - Calories and weight charts refresh in real-time
🔔 **Instant Notifications** - Get notified when workouts are logged

### Tracking Capabilities
🏋️ **Workout Logging** - Track cardio, strength, yoga, sports
📈 **Progress Charts** - Visualize calories burned and weight trends
⚖️ **Daily Logs** - Record weight, steps, water intake, sleep, mood
🎯 **Goals System** - Set and track fitness goals with progress bars
📅 **Historical Data** - View last 30 days of activity

### Dashboard
- Current weight display
- This week's calorie total
- Today's steps counter
- Water intake tracker
- Quick logging interface

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- Socket.IO (real-time bidirectional communication)
- MySQL2 (database with promise support)
- REST API architecture

### Frontend
- React 18 with Hooks
- Chart.js (beautiful charts)
- Socket.IO Client
- Axios (HTTP client)
- Modern CSS3 with gradients and animations

## 📋 Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)
- npm or yarn

## 🚀 Installation

### 1. Database Setup

```bash
mysql -u root -p < backend/schema.sql
```

This creates:
- `fitness_tracker` database
- Sample goals (weight loss, workouts/week, calories/week)
- 14 days of sample workouts
- 14 days of daily logs with mock data

### 2. Backend Configuration

```bash
cd backend

# Edit .env with your MySQL credentials
nano .env

# Install dependencies
npm install

# Start server
npm start
```

Server runs on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

App opens at http://localhost:3000

## 📊 Database Schema

### Goals Table
```sql
- goal_type (weight_loss, weight_gain, workouts_per_week, etc.)
- target_value (target number)
- current_value (current progress)
- deadline (target date)
- status (active, completed, failed)
```

### Workouts Table
```sql
- workout_type (cardio, strength, yoga, sports, other)
- workout_name
- duration_minutes
- calories_burned
- intensity (low, medium, high)
- workout_date
- notes
```

### Daily Logs Table
```sql
- log_date (unique per day)
- weight_kg
- steps
- water_ml
- sleep_hours
- mood (great, good, okay, bad, terrible)
- notes
```

## 🔌 API Endpoints

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Workouts
- `GET /api/workouts` - Get recent workouts
- `GET /api/workouts/chart` - Get chart data (last 30 days)
- `POST /api/workouts` - Log new workout
- `DELETE /api/workouts/:id` - Delete workout

### Daily Logs
- `GET /api/logs` - Get last 30 days logs
- `GET /api/logs/today` - Get or create today's log
- `PUT /api/logs/:date` - Update daily log

### Statistics
- `GET /api/stats` - Get dashboard statistics

## 🔄 Real-Time Events

### Socket.IO Events
- `workout_created` - New workout logged
- `workout_deleted` - Workout removed
- `log_updated` - Daily log updated
- `goal_created` - New goal set
- `goal_updated` - Goal progress updated
- `goal_deleted` - Goal removed

## 🎨 Features in Detail

### 1. Quick Daily Logging
- Update weight, steps, water, sleep, mood
- Changes save automatically
- Real-time sync across devices

### 2. Workout Tracking
- Log any type of workout
- Track duration and calories
- Set intensity level
- Add notes
- View history

### 3. Goals Management
- Set multiple goals
- Visual progress bars
- Track completion percentage
- Set deadlines
- Mark as complete/failed

### 4. Charts
- **Calories Chart**: Bar chart of daily calories burned (last 30 days)
- **Weight Chart**: Line chart showing weight trend (last 14 days)
- Auto-updates when you log new data

## 🧪 Testing Real-Time Features

1. Open http://localhost:3000 in **two browser windows** (or one browser + one phone)
2. Log a workout in window 1
3. Watch the calories chart update **instantly** in window 2!
4. Update today's weight in window 1
5. See weight chart refresh in window 2 in real-time!

## 💡 Usage Tips

### Daily Routine
1. Morning: Log weight and sleep hours
2. Throughout day: Update steps and water
3. After workout: Log your exercise
4. Evening: Check progress on charts

### Goal Setting
- Start with 1-2 realistic goals
- Track weekly progress
- Adjust targets as needed
- Celebrate when you hit milestones!

### Chart Analysis
- **Calories Chart**: See your most active days
- **Weight Chart**: Track trends over time
- Look for patterns and adjust routine

## 🎓 Code Highlights

### Real-Time Update Flow
```
1. User logs workout
   ↓
2. Frontend sends POST to backend
   ↓
3. Backend saves to MySQL
   ↓
4. Backend emits Socket.IO event
   ↓
5. All connected clients receive event
   ↓
6. Charts and UI update instantly!
```

### Smart Daily Log Handling
- Auto-creates today's log if missing
- Uses MySQL `ON DUPLICATE KEY UPDATE` for upserts
- Prevents duplicate date entries

### Chart Updates
- Fetches last 30 days for calories
- Automatically groups by date
- Smooth animations on data changes

## 🔐 Privacy

- **Personal use only** - No user accounts needed
- **Your data only** - Single-user system
- **Local database** - All data stored on your machine

## 🚀 Customization Ideas

### Easy Additions
1. **Exercise library** - Predefined workout templates
2. **Meal tracking** - Log calories consumed
3. **Photo progress** - Upload before/after photos
4. **Export data** - Download CSV of your data
5. **Reminders** - Notification to log daily stats

### Advanced Features
1. **Mobile app** - React Native version
2. **Wearable sync** - Import from Fitbit/Apple Watch
3. **AI insights** - Suggest workouts based on history
4. **Social features** - Share progress with friends
5. **Workout plans** - Follow structured programs

## 📱 Mobile Responsiveness

Fully responsive design works on:
- Desktop computers
- Tablets
- Mobile phones

## 🐛 Troubleshooting

### Charts not showing
- Check browser console for errors
- Verify workouts and logs have data
- Refresh the page

### Real-time not working
- Check connection status (top right)
- Ensure backend is running
- Verify Socket.IO port is accessible

### Data not saving
- Check MySQL connection in backend
- Verify .env credentials
- Look at backend terminal for errors

## 📦 Project Structure

```
fitness-tracker/
├── backend/
│   ├── server.js          # Express + Socket.IO server
│   ├── db.js              # MySQL connection
│   ├── schema.sql         # Database + sample data
│   ├── .env               # Configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js         # Main React component
    │   ├── App.css        # Styling
    │   ├── index.js       # Entry point
    │   └── index.css      # Global styles
    ├── public/
    │   └── index.html
    └── package.json
```

## 🎯 Sample Data

Includes:
- **3 goals** (weight loss, workouts/week, calories/week)
- **14 days of workouts** (various types)
- **14 days of daily logs** (weight, steps, water, sleep, mood)

Perfect for testing and seeing how it works!

## 🔒 Production Tips

- Add user authentication
- Implement data backup
- Set up proper error logging
- Use environment variables
- Enable HTTPS
- Add input validation
- Implement rate limiting

## 📄 License

MIT

---

**Start tracking your fitness journey today! 💪**

Built with ❤️ using Node.js, React, Socket.IO, and Chart.js

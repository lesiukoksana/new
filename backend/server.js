const express = require('express');
const sqlite3 = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Initialize database (Tables & Seeding)
function initializeDatabase() {
  db.serialize(() => {
    // Enable Foreign Keys
    db.run("PRAGMA foreign_keys = ON");

    // Roles Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    // Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        FOREIGN KEY (role_id) REFERENCES Roles (id) ON DELETE CASCADE
      )
    `);

    // Modules Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER
      )
    `);

    // Gestures Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Gestures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER,
        character TEXT NOT NULL,
        video_url TEXT,
        ai_rules_config TEXT, -- JSON string
        FOREIGN KEY (module_id) REFERENCES Modules (id) ON DELETE CASCADE
      )
    `);

    // Practice Sessions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Practice_Sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
      )
    `);

    // Attempt Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS Attempt_Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        gesture_id INTEGER,
        is_correct BOOLEAN,
        confidence_score REAL,
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES Practice_Sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (gesture_id) REFERENCES Gestures (id) ON DELETE CASCADE
      )
    `);

    // Seed Data
    seedDatabase();
  });
}

function seedDatabase() {
  db.get("SELECT COUNT(*) AS count FROM Modules", (err, row) => {
    if (err) return;

    if (row.count === 0) {
      console.log("Seeding database with full Ukrainian alphabet...");
      
      db.serialize(() => {
        // 1. Seed Roles and Test User
        db.run("INSERT OR IGNORE INTO Roles (name) VALUES ('Admin'), ('Student'), ('Parent')");
        db.get("SELECT id FROM Roles WHERE name = 'Student'", (err, roleRow) => {
          if (roleRow) {
            db.run("INSERT OR IGNORE INTO Users (role_id, username, email) VALUES (?, 'test_student', 'student@example.com')", [roleRow.id]);
          }
        });

        // 2. Define Modules and their Letters
        const curriculum = [
          { 
            title: 'Unit 1: Basics', 
            desc: 'Весь український алфавіт (33 літери)', 
            letters: ['А', 'Б', 'В', 'Г', 'Ґ', 'Д', 'Е', 'Є', 'Ж', 'З', 'И', 'І', 'Ї', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ь', 'Ю', 'Я'] 
          }
        ];

        const defaultVideoUrl = "https://v.pexels.com/video-files/4440944/4440944-sd_640_360_30fps.mp4";
        const placeholderAiRules = JSON.stringify({ "type": "static", "difficulty": "easy" });

        const charMap = {
          'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye',
          'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Yj', 'К': 'K', 'Л': 'L',
          'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
          'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': 'Soft',
          'Ю': 'Yu', 'Я': 'Ya'
        };

        curriculum.forEach((moduleData, index) => {
          db.run("INSERT INTO Modules (title, description, order_index) VALUES (?, ?, ?)", 
            [moduleData.title, moduleData.desc, index + 1], 
            function(err) {
              if (err) return;
              const moduleId = this.lastID;

              const stmt = db.prepare("INSERT INTO Gestures (module_id, character, video_url, ai_rules_config) VALUES (?, ?, ?, ?)");
              moduleData.letters.forEach((char) => {
                const latinChar = charMap[char] || char;
                const videoUrl = `/videos/video${latinChar}.mp4`;
                // Note: Only videoA.mp4 is currently confirmed to exist.
                stmt.run(moduleId, char, videoUrl, placeholderAiRules);
              });
              stmt.finalize();
            }
          );
        });
        console.log('Database seeded with 33 letters.');
      });
    }
  });
}

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO Users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)";
    // Default role_id = 2 (Student) - assuming role_id 2 exists from seeding
    db.run(sql, [username, email, password_hash, 2], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already exists' });
        return res.status(400).json({ error: err.message });
      }
      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ message: 'success', token, user: { id: this.lastID, username, email } });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const sql = "SELECT * FROM Users WHERE username = ?";
  db.get(sql, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'success', token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const sql = "SELECT id, username, email FROM Users WHERE id = ?";
  db.get(sql, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'success', user });
  });
});

// API Endpoints
app.post('/api/sessions', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ "error": "user_id required" });

  db.run("INSERT INTO Practice_Sessions (user_id) VALUES (?)", [user_id], function(err) {
    if (err) return res.status(400).json({ "error": err.message });
    res.json({ "message": "success", "session_id": this.lastID });
  });
});

app.get('/api/gestures/:id', (req, res) => {
  const sql = "SELECT * FROM Gestures WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ "error": err.message });
    if (!row) return res.status(404).json({ "message": "Gesture not found" });
    res.json({ "message": "success", "data": row });
  });
});

app.post('/api/attempts', (req, res) => {
  const { session_id, gesture_id, is_correct, is_successful, confidence_score } = req.body;
  const status = is_correct !== undefined ? is_correct : is_successful;

  if (!session_id || !gesture_id || status === undefined) {
    return res.status(400).json({ "error": "Missing required fields" });
  }

  const sql = "INSERT INTO Attempt_Logs (session_id, gesture_id, is_correct, confidence_score) VALUES (?, ?, ?, ?)";
  db.run(sql, [session_id, gesture_id, status ? 1 : 0, confidence_score || 0], function(err) {
    if (err) return res.status(400).json({ "error": err.message });
    
    // Update session end_time to now
    db.run("UPDATE Practice_Sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ?", [session_id]);
    
    res.json({ "message": "success", "attempt_id": this.lastID });
  });
});

app.get('/api/stats/activity/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT 
      date(attempt_time) as date,
      strftime('%w', attempt_time) as day_index,
      AVG(is_correct) * 100 as accuracy
    FROM Attempt_Logs al
    JOIN Practice_Sessions ps ON al.session_id = ps.id
    WHERE ps.user_id = ? AND attempt_time >= date('now', '-6 days')
    GROUP BY date
    ORDER BY date ASC
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(400).json({ "error": err.message });
    res.json({ "message": "success", "data": rows });
  });
});

app.get('/api/stats/difficult/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT 
      g.character,
      COUNT(*) as attempts,
      (AVG(is_correct) * 100) as accuracy
    FROM Attempt_Logs al
    JOIN Practice_Sessions ps ON al.session_id = ps.id
    JOIN Gestures g ON al.gesture_id = g.id
    WHERE ps.user_id = ?
    GROUP BY g.id
    ORDER BY accuracy ASC, attempts DESC
    LIMIT 3
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(400).json({ "error": err.message });
    res.json({ "message": "success", "data": rows });
  });
});

app.get('/api/stats/time/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT 
      SUM(strftime('%s', end_time) - strftime('%s', start_time)) as total_seconds,
      MAX(end_time) as last_session
    FROM Practice_Sessions
    WHERE user_id = ? AND end_time IS NOT NULL
  `;

  db.get(sql, [userId], (err, row) => {
    if (err) return res.status(400).json({ "error": err.message });
    res.json({ "message": "success", "data": row });
  });
});

app.get('/api/modules', (req, res) => {
  const userId = req.query.user_id || 1;
  
  const sql = `
    SELECT m.id as module_id, m.title as module_title, m.description as module_desc,
           g.id as gesture_id, g.character, g.video_url,
           (SELECT is_correct FROM Attempt_Logs al 
            JOIN Practice_Sessions ps ON al.session_id = ps.id 
            WHERE al.gesture_id = g.id AND ps.user_id = ? 
            AND al.is_correct = 1 LIMIT 1) as is_done
    FROM Modules m
    LEFT JOIN Gestures g ON m.id = g.module_id
    ORDER BY m.order_index, g.id
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(400).json({ "error": err.message });

    const modules = rows.reduce((acc, row) => {
      let module = acc.find(m => m.id === row.module_id);
      if (!module) {
        module = { id: row.module_id, title: row.module_title, description: row.module_desc, gestures: [] };
        acc.push(module);
      }
      if (row.gesture_id) {
        module.gestures.push({ id: row.gesture_id, character: row.character, is_done: !!row.is_done });
      }
      return acc;
    }, []);

    res.json({ "message": "success", "data": modules });
  });
});

app.get('/api/letters', (req, res) => {
  const userId = req.query.user_id || 1;
  const sql = `
    SELECT g.*, 
    (SELECT is_correct FROM Attempt_Logs al 
     JOIN Practice_Sessions ps ON al.session_id = ps.id 
     WHERE al.gesture_id = g.id AND ps.user_id = ? 
     AND al.is_correct = 1 LIMIT 1) as is_done
    FROM Gestures g
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(400).json({ "error": err.message });
    const sortedGestures = rows.sort((a, b) => a.character.localeCompare(b.character, 'uk'));
    let previousDone = true;
    const dataWithStatus = sortedGestures.map((g, index) => {
      const isDone = g.is_done === 1;
      const isUnlocked = index === 0 || previousDone;
      previousDone = isDone;
      return { ...g, locked: !isUnlocked, status: isDone ? 'done' : 'not-started' };
    });
    res.json({ "message": "success", "data": dataWithStatus });
  });
});

app.get('/api/stats/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const statsSql = `
    SELECT 
      (SELECT COUNT(DISTINCT gesture_id) FROM Attempt_Logs al JOIN Practice_Sessions ps ON al.session_id = ps.id WHERE ps.user_id = ? AND al.is_correct = 1) as learned_count,
      (SELECT COUNT(*) FROM Gestures) as total_count,
      (SELECT AVG(is_correct) * 100 FROM Attempt_Logs al JOIN Practice_Sessions ps ON al.session_id = ps.id WHERE ps.user_id = ?) as avg_accuracy
  `;

  db.get(statsSql, [userId, userId], (err, stats) => {
    if (err) return res.status(400).json({ "error": err.message });
    res.json({ "message": "success", "data": stats });
  });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

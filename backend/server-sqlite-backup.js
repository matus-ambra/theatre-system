require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Import router modules
const playsRouter = require('./routes/plays');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://la-komika-calendar.netlify.app', // Legacy Netlify URL
  process.env.FRONTEND_URL, // Additional frontend URL from env
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow any Netlify subdomain
    if (origin && (origin.includes('.netlify.app') || origin.includes('netlify.app'))) {
      return callback(null, true);
    }

    // Allow any Render subdomain
    if (origin && (origin.includes('.onrender.com') || origin.includes('onrender.com'))) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database setup
const db = new sqlite3.Database('scheduler.db');

// Enable foreign key constraints
db.run('PRAGMA foreign_keys = ON');

// Initialize database tables
db.serialize(() => {
  // Users table (admin and worker passwords)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Workers table
  db.run(`CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: Add color column to workers table if it doesn't exist
  db.run(`PRAGMA table_info(workers)`, (err, result) => {
    if (!err) {
      db.all(`PRAGMA table_info(workers)`, (err, columns) => {
        if (!err) {
          const hasColorColumn = columns.some(col => col.name === 'color');
          const hasActiveColumn = columns.some(col => col.name === 'active');

          if (!hasColorColumn) {
            console.log('Adding color column to workers table...');
            db.run(`ALTER TABLE workers ADD COLUMN color TEXT DEFAULT '#999999'`, (err) => {
              if (err) {
                console.error('Error adding color column:', err);
              } else {
                console.log('Color column added successfully');
              }
            });
          }

          if (!hasActiveColumn) {
            console.log('Adding active column to workers table...');
            db.run(`ALTER TABLE workers ADD COLUMN active BOOLEAN DEFAULT 1`, (err) => {
              if (err) {
                console.error('Error adding active column:', err);
              } else {
                console.log('Active column added successfully');
              }
            });
          }
        }
      });
    }
  });

  // Actors table
  db.run(`CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Actor availability table
  db.run(`CREATE TABLE IF NOT EXISTS actor_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_name TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(actor_name, date),
    FOREIGN KEY (actor_name) REFERENCES actors(name) ON DELETE CASCADE
  )`);

  // Planned plays table
  db.run(`CREATE TABLE IF NOT EXISTS planned_plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    play_id TEXT NOT NULL,
    play_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Calendar labels table
  db.run(`CREATE TABLE IF NOT EXISTS calendar_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    label TEXT NOT NULL,
    workers_needed INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Worker assignments table
  db.run(`CREATE TABLE IF NOT EXISTS worker_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calendar_label_id INTEGER,
    worker_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (calendar_label_id) REFERENCES calendar_labels (id),
    FOREIGN KEY (worker_id) REFERENCES workers (id)
  )`);

  // Insert default users if they don't exist
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
    if (row.count === 0) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO users (role, password) VALUES ('admin', ?)", [adminPassword]);
    }
  });

  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'worker'", (err, row) => {
    if (row.count === 0) {
      const workerPassword = bcrypt.hashSync('worker123', 10);
      db.run("INSERT INTO users (role, password) VALUES ('worker', ?)", [workerPassword]);
    }
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  // Check passwords directly
  const ADMIN_CODE = "matus";
  const WORKER_CODE = "NatyJeBoss2025";
  const ACTOR_CODE = "kulisa25";

  let role = null;
  if (password === ADMIN_CODE) {
    role = 'admin';
  } else if (password === WORKER_CODE) {
    role = 'worker';
  } else if (password === ACTOR_CODE) {
    role = 'actor';
  } else {
    return res.status(401).json({ error: 'Nesprávne heslo' });
  }

  const token = jwt.sign({ role, userId: role === 'admin' ? 1 : (role === 'worker' ? 2 : 3) }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role });
});

// Admin routes
app.post('/api/admin/workers', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all("SELECT * FROM workers ORDER BY name", (err, workers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(workers);
  });
});

app.post('/api/admin/workers', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, color = '#999999' } = req.body;
  db.run("INSERT INTO workers (name, color) VALUES (?, ?)", [name, color], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, name, color });
  });
});

app.delete('/api/admin/workers/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  db.run("DELETE FROM workers WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

app.post('/api/admin/calendar-labels', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all("SELECT * FROM calendar_labels ORDER BY date", (err, labels) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(labels);
  });
});

app.post('/api/admin/calendar-labels', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date, label, workers_needed } = req.body;
  db.run("INSERT INTO calendar_labels (date, label, workers_needed) VALUES (?, ?, ?)",
    [date, label, workers_needed], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, date, label, workers_needed });
  });
});

// Shared route for calendar data with assignments
app.post('/api/calendar-data', authenticateToken, (req, res) => {
  const query = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers,
      GROUP_CONCAT(w.name) as assigned_worker_names,
      GROUP_CONCAT(w.color) as assigned_worker_colors
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    GROUP BY cl.id
    ORDER BY cl.date
  `;

  db.all(query, (err, calendar_data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Parse assigned worker names and colors from comma-separated strings to arrays
    const formattedData = calendar_data.map(item => {
      const workerNames = item.assigned_worker_names ? item.assigned_worker_names.split(',') : [];
      const workerColors = item.assigned_worker_colors ? item.assigned_worker_colors.split(',') : [];

      const workers = workerNames.map((name, index) => ({
        name,
        color: workerColors[index] || '#999999'
      }));

      return {
        ...item,
        assigned_workers: item.assigned_workers || 0,
        workers
      };
    });

    res.json(formattedData);
  });
});

// Worker routes
app.post('/api/worker/available-slots', authenticateToken, (req, res) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({ error: 'Worker access required' });
  }

  const query = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    GROUP BY cl.id
    HAVING assigned_workers < cl.workers_needed
    ORDER BY cl.date
  `;

  db.all(query, (err, slots) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(slots);
  });
});

app.post('/api/workers', authenticateToken, (req, res) => {
  db.all("SELECT * FROM workers ORDER BY name", (err, workers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(workers);
  });
});

// Simplified endpoints for Slovak version compatibility
// Get month data in the format expected by the frontend
app.post('/api/month/:yearMonth', authenticateToken, (req, res) => {
  const { yearMonth } = req.params;
  const [year, month] = yearMonth.split('-').map(Number);

  console.log(`Loading month data for: ${yearMonth}`);

  const query = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed,
      GROUP_CONCAT(w.name) as worker_names
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    WHERE substr(cl.date, 1, 7) = ?
    GROUP BY cl.date, cl.label
    ORDER BY cl.date
  `;

  db.all(query, [yearMonth], (err, results) => {
    if (err) {
      console.error('Error loading month data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Raw query results:', results);

    const data = {};
    results.forEach(row => {
      data[row.date] = {
        label: row.label,
        workers: row.worker_names ? row.worker_names.split(',') : [],
        workersNeeded: row.workers_needed || 2
      };
    });

    console.log('Formatted month data:', data);
    res.json(data);
  });
});

// POST version for month data (frontend compatibility)
app.post('/api/month/:yearMonth', authenticateToken, (req, res) => {
  const { yearMonth } = req.params;
  const [year, month] = yearMonth.split('-').map(Number);

  console.log(`Loading month data for: ${yearMonth}`);

  const query = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed,
      GROUP_CONCAT(w.name) as worker_names
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    WHERE substr(cl.date, 1, 7) = ?
    GROUP BY cl.date, cl.label
    ORDER BY cl.date
  `;

  db.all(query, [yearMonth], (err, results) => {
    if (err) {
      console.error('Error loading month data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Raw query results:', results);

    const data = {};
    results.forEach(row => {
      data[row.date] = {
        label: row.label,
        workers: row.worker_names ? row.worker_names.split(',') : [],
        workersNeeded: row.workers_needed || 2
      };
    });

    console.log('Formatted month data:', data);
    res.json(data);
  });
});

// POST version for calendar data (frontend compatibility)
app.post('/api/calendar-data', authenticateToken, (req, res) => {
  const query = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers,
      GROUP_CONCAT(w.name) as assigned_worker_names,
      GROUP_CONCAT(w.color) as assigned_worker_colors
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    GROUP BY cl.id
    ORDER BY cl.date
  `;

  db.all(query, (err, calendar_data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Parse assigned worker names and colors from comma-separated strings to arrays
    const formattedData = calendar_data.map(item => {
      const workerNames = item.assigned_worker_names ? item.assigned_worker_names.split(',') : [];
      const workerColors = item.assigned_worker_colors ? item.assigned_worker_colors.split(',') : [];

      const workers = workerNames.map((name, index) => ({
        name,
        color: workerColors[index] || '#999999'
      }));

      return {
        ...item,
        assigned_workers: item.assigned_workers || 0,
        workers
      };
    });

    res.json(formattedData);
  });
});

// Save/update calendar entry
app.post('/api/calendar/:date', authenticateToken, (req, res) => {
  const { date } = req.params;
  const { label, workers, workersNeeded } = req.body;

  console.log(`Saving calendar entry for date: ${date}`);
  console.log(`Label: "${label}", Workers:`, workers, `WorkersNeeded: ${workersNeeded}`);
  console.log(`User role: ${req.user.role}`);

  // First get existing workersNeeded if we're a worker
  db.get(`SELECT workers_needed FROM calendar_labels WHERE date = ?`, [date], (err, existingLabel) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    // Store original workersNeeded for workers
    const originalWorkersNeeded = existingLabel ? existingLabel.workers_needed : null;

    // Now delete existing entry
    const deleteQuery = `DELETE FROM worker_assignments WHERE calendar_label_id IN
      (SELECT id FROM calendar_labels WHERE date = ?)`;
    const deleteLabelQuery = `DELETE FROM calendar_labels WHERE date = ?`;

  db.run(deleteQuery, [date], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    db.run(deleteLabelQuery, [date], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // If no label, just return success (deletion complete)
      if (!label || label.trim() === '') {
        console.log('No label provided, deletion complete');
        return res.json({ success: true });
      }

      // Insert new label
      const finalWorkersNeeded = workersNeeded ||
        (req.user.role === 'worker' && originalWorkersNeeded ? originalWorkersNeeded : 2);
      console.log('Inserting new label into database:', { date, label, workers_needed: finalWorkersNeeded });
      db.run(`INSERT INTO calendar_labels (date, label, workers_needed) VALUES (?, ?, ?)`,
        [date, label, finalWorkersNeeded],
        function(err) {
          if (err) {
            console.error('Error inserting calendar label:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          const labelId = this.lastID;
          console.log('Calendar label inserted with ID:', labelId);

          if (workers && workers.length > 0) {
            // Insert workers
            const workerPromises = workers.map(workerName => {
              return new Promise((resolve, reject) => {
                // Find or create worker
                db.get(`SELECT id FROM workers WHERE name = ?`, [workerName], (err, worker) => {
                  if (err) return reject(err);

                  if (worker) {
                    // Worker exists, assign them
                    db.run(`INSERT INTO worker_assignments (calendar_label_id, worker_id) VALUES (?, ?)`,
                      [labelId, worker.id], (err) => {
                        if (err) reject(err); else resolve();
                      });
                  } else {
                    // Create new worker and assign
                    db.run(`INSERT INTO workers (name, color) VALUES (?, ?)`,
                      [workerName, '#999999'], function(err) {
                        if (err) return reject(err);

                        db.run(`INSERT INTO worker_assignments (calendar_label_id, worker_id) VALUES (?, ?)`,
                          [labelId, this.lastID], (err) => {
                            if (err) reject(err); else resolve();
                          });
                      });
                  }
                });
              });
            });

            Promise.all(workerPromises)
              .then(() => {
                console.log('Calendar entry saved successfully with workers');
                res.json({ success: true });
              })
              .catch(err => {
                console.error('Error saving worker assignments:', err);
                res.status(500).json({ error: 'Database error' });
              });
          } else {
            console.log('Calendar entry saved successfully without workers');
            res.json({ success: true });
          }
        }
      );
    });
  });
  });
});

// Get workers with colors
app.post('/api/workers-colors', authenticateToken, (req, res) => {
  console.log('Getting workers with colors for user role:', req.user.role);
  db.all(`SELECT name, color FROM workers WHERE active = 1 ORDER BY name`, (err, workers) => {
    if (err) {
      console.error('Database error getting workers:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const workerColors = {};
    workers.forEach(worker => {
      workerColors[worker.name] = worker.color;
    });

    console.log('Returning worker colors:', workerColors);
    res.json(workerColors);
  });
});

// POST version for workers-colors-get (frontend compatibility)
app.post('/api/workers-colors-get', authenticateToken, (req, res) => {
  console.log('Getting workers with colors for user role:', req.user.role);
  db.all(`SELECT name, color FROM workers WHERE active = 1 ORDER BY name`, (err, workers) => {
    if (err) {
      console.error('Database error getting workers:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const workerColors = {};
    workers.forEach(worker => {
      workerColors[worker.name] = worker.color;
    });

    console.log('Returning worker colors:', workerColors);
    res.json(workerColors);
  });
});

// Save workers with colors
app.post('/api/workers-colors', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const workerColors = req.body;
  console.log('Saving workers:', workerColors);

  // Get existing workers (including inactive ones for comparison)
  db.all(`SELECT name FROM workers`, (err, existingWorkers) => {
    if (err) {
      console.error('Database error getting workers:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const existingNames = new Set(existingWorkers.map(w => w.name));
    const newNames = new Set(Object.keys(workerColors));

    // Update existing workers colors
    const updatePromises = [];

    // Add new workers
    for (const [name, color] of Object.entries(workerColors)) {
      if (existingNames.has(name)) {
        // Update existing worker color and reactivate if inactive
        updatePromises.push(new Promise((resolve, reject) => {
          db.run(`UPDATE workers SET color = ?, active = 1 WHERE name = ?`, [color, name], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      } else {
        // Insert new worker as active
        updatePromises.push(new Promise((resolve, reject) => {
          db.run(`INSERT INTO workers (name, color, active) VALUES (?, ?, 1)`, [name, color], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }
    }

    // Mark workers not in the new list as inactive (soft delete)
    for (const existingName of existingNames) {
      if (!newNames.has(existingName)) {
        updatePromises.push(new Promise((resolve, reject) => {
          // Mark worker as inactive instead of deleting
          db.run(`UPDATE workers SET active = 0 WHERE name = ?`, [existingName], (err) => {
            if (err) reject(err); else resolve();
          });
        }));
      }
    }

    Promise.all(updatePromises)
      .then(() => {
        console.log('Workers saved successfully');
        res.json({ success: true });
      })
      .catch(err => {
        console.error('Error saving workers:', err);
        res.status(500).json({ error: 'Database error' });
      });
  });
});

app.post('/api/worker/assign', authenticateToken, (req, res) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({ error: 'Worker access required' });
  }

  const { calendar_label_id, worker_id } = req.body;

  // Check if slot is still available
  const checkQuery = `
    SELECT
      cl.workers_needed,
      COUNT(wa.id) as assigned_workers
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    WHERE cl.id = ?
    GROUP BY cl.id
  `;

  db.get(checkQuery, [calendar_label_id], (err, slot) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!slot || slot.assigned_workers >= slot.workers_needed) {
      return res.status(400).json({ error: 'Slot is full' });
    }

    db.run("INSERT INTO worker_assignments (calendar_label_id, worker_id) VALUES (?, ?)",
      [calendar_label_id, worker_id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, calendar_label_id, worker_id });
    });
  });
});

// Get worker schedule for calendar export
app.post('/api/worker-schedule/:workerName/:yearMonth', authenticateToken, (req, res) => {
  const { workerName, yearMonth } = req.params;

  // Allow both workers and admins to access worker schedules
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  console.log(`Fetching schedule for worker: ${workerName}, month: ${yearMonth}`);

  const query = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed
    FROM calendar_labels cl
    JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    JOIN workers w ON wa.worker_id = w.id
    WHERE w.name = ? AND substr(cl.date, 1, 7) = ?
    ORDER BY cl.date
  `;

  db.all(query, [workerName, yearMonth], (err, assignments) => {
    if (err) {
      console.error('Error fetching worker schedule:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`Found ${assignments.length} assignments for ${workerName} in ${yearMonth}`);
    res.json(assignments);
  });
});

// Actors management endpoints
app.post('/api/actors', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all("SELECT * FROM actors ORDER BY name", (err, actors) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert to object format like workers
    const actorsObj = {};
    actors.forEach(actor => {
      actorsObj[actor.name] = { id: actor.id, name: actor.name };
    });

    res.json(actorsObj);
  });
});

app.post('/api/actors', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Actor name is required' });
  }

  db.run("INSERT INTO actors (name) VALUES (?)", [name], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Actor already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, name });
  });
});

app.delete('/api/actors/:name', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name } = req.params;
  db.run("DELETE FROM actors WHERE name = ?", [name], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// Use plays router
app.use('/api/plays', playsRouter);

// Actor availability endpoints
app.post('/api/actor-availability/:actorName/:yearMonth', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { actorName, yearMonth } = req.params;

  db.all(
    "SELECT date FROM actor_availability WHERE actor_name = ? AND substr(date, 1, 7) = ?",
    [actorName, yearMonth],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Convert to object format {"2025-10-15": true, ...}
      const availability = {};
      results.forEach(row => {
        availability[row.date] = true;
      });

      res.json(availability);
    }
  );
});

app.post('/api/actor-availability', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { actorName, date, available } = req.body;

  if (available) {
    // Add availability
    db.run(
      "INSERT OR IGNORE INTO actor_availability (actor_name, date) VALUES (?, ?)",
      [actorName, date],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  } else {
    // Remove availability
    db.run(
      "DELETE FROM actor_availability WHERE actor_name = ? AND date = ?",
      [actorName, date],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  }
});

app.post('/api/actor-availability', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({});
});

// Planned plays endpoints
app.post('/api/planned-plays/:yearMonth', authenticateToken, (req, res) => {
  const { yearMonth } = req.params;
  const yearMonthPattern = `${yearMonth}-%`;

  db.all(
    "SELECT date, play_id, play_name FROM planned_plays WHERE date LIKE ?",
    [yearMonthPattern],
    (err, rows) => {
      if (err) {
        console.error('Error loading planned plays:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const plannedPlays = {};
      rows.forEach(row => {
        plannedPlays[row.date] = {
          playId: row.play_id,
          playName: row.play_name
        };
      });

      res.json(plannedPlays);
    }
  );
});

app.post('/api/planned-plays', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date, playId, playName } = req.body;

  db.run(
    "INSERT OR REPLACE INTO planned_plays (date, play_id, play_name) VALUES (?, ?, ?)",
    [date, playId, playName],
    function(err) {
      if (err) {
        console.error('Error saving planned play:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/planned-plays/:date', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date } = req.params;

  db.run(
    "DELETE FROM planned_plays WHERE date = ?",
    [date],
    function(err) {
      if (err) {
        console.error('Error deleting planned play:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Health check endpoint for Render
app.post('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LA KOMIKA Theatre System Backend'
  });
});

app.listen(PORT, () => {
  console.log(`LA KOMIKA Theatre System Backend running on port ${PORT}`);
});

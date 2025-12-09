require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Import database module
const { pool, query, getOne, getAll, initializeDatabase } = require('./database');

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

// Initialize database
initializeDatabase().catch(console.error);

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
app.post('/api/admin/workers', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const workers = await getAll("SELECT * FROM workers ORDER BY name");
    res.json(workers);
  } catch (err) {
    console.error('Error fetching workers:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/workers', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, color = '#999999' } = req.body;
  try {
    const result = await query(
      "INSERT INTO workers (name, color) VALUES ($1, $2) RETURNING *",
      [name, color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating worker:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/admin/workers/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  try {
    await query("DELETE FROM workers WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting worker:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/calendar-labels', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const labels = await getAll("SELECT * FROM calendar_labels ORDER BY date");
    res.json(labels);
  } catch (err) {
    console.error('Error fetching calendar labels:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/calendar-labels', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date, label, workers_needed } = req.body;
  try {
    const result = await query(
      "INSERT INTO calendar_labels (date, label, workers_needed) VALUES ($1, $2, $3) RETURNING *",
      [date, label, workers_needed]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating calendar label:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Shared route for calendar data with assignments
app.post('/api/calendar-data', authenticateToken, async (req, res) => {
  const queryText = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers,
      STRING_AGG(w.name, ',') as assigned_worker_names,
      STRING_AGG(w.color, ',') as assigned_worker_colors
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    GROUP BY cl.id
    ORDER BY cl.date
  `;

  try {
    const calendar_data = await getAll(queryText);

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
        assigned_workers: parseInt(item.assigned_workers) || 0,
        workers
      };
    });

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching calendar data:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Worker routes
app.post('/api/worker/available-slots', authenticateToken, async (req, res) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({ error: 'Worker access required' });
  }

  const queryText = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    GROUP BY cl.id
    HAVING COUNT(wa.id) < cl.workers_needed
    ORDER BY cl.date
  `;

  try {
    const slots = await getAll(queryText);
    res.json(slots);
  } catch (err) {
    console.error('Error fetching available slots:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    const workers = await getAll("SELECT * FROM workers ORDER BY name");
    res.json(workers);
  } catch (err) {
    console.error('Error fetching workers:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Simplified endpoints for Slovak version compatibility
// Get month data in the format expected by the frontend
app.post('/api/month/:yearMonth', authenticateToken, async (req, res) => {
  const { yearMonth } = req.params;

  console.log(`Loading month data for: ${yearMonth}`);

  const queryText = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed,
      STRING_AGG(w.name, ',') as worker_names
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    WHERE SUBSTRING(cl.date, 1, 7) = $1
    GROUP BY cl.date, cl.label, cl.workers_needed
    ORDER BY cl.date
  `;

  try {
    const results = await getAll(queryText, [yearMonth]);
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
  } catch (err) {
    console.error('Error loading month data:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST version for month data (frontend compatibility)
app.post('/api/month/:yearMonth', authenticateToken, async (req, res) => {
  const { yearMonth } = req.params;

  console.log(`Loading month data for: ${yearMonth}`);

  const queryText = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed,
      STRING_AGG(w.name, ',') as worker_names
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    WHERE SUBSTRING(cl.date, 1, 7) = $1
    GROUP BY cl.date, cl.label, cl.workers_needed
    ORDER BY cl.date
  `;

  try {
    const results = await getAll(queryText, [yearMonth]);
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
  } catch (err) {
    console.error('Error loading month data:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST version for calendar data (frontend compatibility)
app.post('/api/calendar-data', authenticateToken, async (req, res) => {
  const queryText = `
    SELECT
      cl.*,
      COUNT(wa.id) as assigned_workers,
      STRING_AGG(w.name, ',') as assigned_worker_names,
      STRING_AGG(w.color, ',') as assigned_worker_colors
    FROM calendar_labels cl
    LEFT JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    LEFT JOIN workers w ON wa.worker_id = w.id
    GROUP BY cl.id
    ORDER BY cl.date
  `;

  try {
    const calendar_data = await getAll(queryText);

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
        assigned_workers: parseInt(item.assigned_workers) || 0,
        workers
      };
    });

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching calendar data:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Save/update calendar entry
app.post('/api/calendar/:date', authenticateToken, async (req, res) => {
  const { date } = req.params;
  const { label, workers, workersNeeded } = req.body;

  console.log(`Saving calendar entry for date: ${date}`);
  console.log(`Label: "${label}", Workers:`, workers, `WorkersNeeded: ${workersNeeded}`);
  console.log(`User role: ${req.user.role}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // First get existing workersNeeded if we're a worker
    const existingLabel = await client.query(
      'SELECT workers_needed FROM calendar_labels WHERE date = $1',
      [date]
    );
    const originalWorkersNeeded = existingLabel.rows[0] ? existingLabel.rows[0].workers_needed : null;

    // Delete existing entry
    await client.query(
      `DELETE FROM worker_assignments WHERE calendar_label_id IN
        (SELECT id FROM calendar_labels WHERE date = $1)`,
      [date]
    );
    await client.query('DELETE FROM calendar_labels WHERE date = $1', [date]);

    // If no label, just return success (deletion complete)
    if (!label || label.trim() === '') {
      console.log('No label provided, deletion complete');
      await client.query('COMMIT');
      return res.json({ success: true });
    }

    // Insert new label
    const finalWorkersNeeded = workersNeeded ||
      (req.user.role === 'worker' && originalWorkersNeeded ? originalWorkersNeeded : 2);
    console.log('Inserting new label into database:', { date, label, workers_needed: finalWorkersNeeded });

    const labelResult = await client.query(
      'INSERT INTO calendar_labels (date, label, workers_needed) VALUES ($1, $2, $3) RETURNING id',
      [date, label, finalWorkersNeeded]
    );
    const labelId = labelResult.rows[0].id;
    console.log('Calendar label inserted with ID:', labelId);

    if (workers && workers.length > 0) {
      // Insert workers
      for (const workerName of workers) {
        // Find or create worker
        let workerResult = await client.query('SELECT id FROM workers WHERE name = $1', [workerName]);

        let workerId;
        if (workerResult.rows.length > 0) {
          workerId = workerResult.rows[0].id;
        } else {
          // Create new worker
          const newWorker = await client.query(
            'INSERT INTO workers (name, color) VALUES ($1, $2) RETURNING id',
            [workerName, '#999999']
          );
          workerId = newWorker.rows[0].id;
        }

        // Assign worker
        await client.query(
          'INSERT INTO worker_assignments (calendar_label_id, worker_id) VALUES ($1, $2)',
          [labelId, workerId]
        );
      }
      console.log('Calendar entry saved successfully with workers');
    } else {
      console.log('Calendar entry saved successfully without workers');
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving calendar entry:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// Get workers with colors
app.post('/api/workers-colors', authenticateToken, async (req, res) => {
  console.log('Getting workers with colors for user role:', req.user.role);

  try {
    const workers = await getAll('SELECT name, color FROM workers WHERE active = true ORDER BY name');

    const workerColors = {};
    workers.forEach(worker => {
      workerColors[worker.name] = worker.color;
    });

    console.log('Returning worker colors:', workerColors);
    res.json(workerColors);
  } catch (err) {
    console.error('Database error getting workers:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST version for workers-colors-get (frontend compatibility)
app.post('/api/workers-colors-get', authenticateToken, async (req, res) => {
  console.log('Getting workers with colors for user role:', req.user.role);

  try {
    const workers = await getAll('SELECT name, color FROM workers WHERE active = true ORDER BY name');

    const workerColors = {};
    workers.forEach(worker => {
      workerColors[worker.name] = worker.color;
    });

    console.log('Returning worker colors:', workerColors);
    res.json(workerColors);
  } catch (err) {
    console.error('Database error getting workers:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Save workers with colors
app.post('/api/workers-colors', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const workerColors = req.body;
  console.log('Saving workers:', workerColors);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get existing workers (including inactive ones for comparison)
    const existingWorkers = await client.query('SELECT name FROM workers');
    const existingNames = new Set(existingWorkers.rows.map(w => w.name));
    const newNames = new Set(Object.keys(workerColors));

    // Add/update workers
    for (const [name, color] of Object.entries(workerColors)) {
      if (existingNames.has(name)) {
        // Update existing worker color and reactivate if inactive
        await client.query(
          'UPDATE workers SET color = $1, active = true WHERE name = $2',
          [color, name]
        );
      } else {
        // Insert new worker as active
        await client.query(
          'INSERT INTO workers (name, color, active) VALUES ($1, $2, true)',
          [name, color]
        );
      }
    }

    // Mark workers not in the new list as inactive (soft delete)
    for (const existingName of existingNames) {
      if (!newNames.has(existingName)) {
        await client.query('UPDATE workers SET active = false WHERE name = $1', [existingName]);
      }
    }

    await client.query('COMMIT');
    console.log('Workers saved successfully');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving workers:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

app.post('/api/worker/assign', authenticateToken, async (req, res) => {
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
    WHERE cl.id = $1
    GROUP BY cl.id, cl.workers_needed
  `;

  try {
    const slot = await getOne(checkQuery, [calendar_label_id]);

    if (!slot || parseInt(slot.assigned_workers) >= slot.workers_needed) {
      return res.status(400).json({ error: 'Slot is full' });
    }

    const result = await query(
      "INSERT INTO worker_assignments (calendar_label_id, worker_id) VALUES ($1, $2) RETURNING *",
      [calendar_label_id, worker_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error assigning worker:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get worker schedule for calendar export
app.post('/api/worker-schedule/:workerName/:yearMonth', authenticateToken, async (req, res) => {
  const { workerName, yearMonth } = req.params;

  // Allow both workers and admins to access worker schedules
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  console.log(`Fetching schedule for worker: ${workerName}, month: ${yearMonth}`);

  const queryText = `
    SELECT
      cl.date,
      cl.label,
      cl.workers_needed
    FROM calendar_labels cl
    JOIN worker_assignments wa ON cl.id = wa.calendar_label_id
    JOIN workers w ON wa.worker_id = w.id
    WHERE w.name = $1 AND SUBSTRING(cl.date, 1, 7) = $2
    ORDER BY cl.date
  `;

  try {
    const assignments = await getAll(queryText, [workerName, yearMonth]);
    console.log(`Found ${assignments.length} assignments for ${workerName} in ${yearMonth}`);
    res.json(assignments);
  } catch (err) {
    console.error('Error fetching worker schedule:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Actors management endpoints
app.post('/api/actors', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const actors = await getAll("SELECT * FROM actors ORDER BY name");

    // Convert to object format like workers
    const actorsObj = {};
    actors.forEach(actor => {
      actorsObj[actor.name] = { id: actor.id, name: actor.name };
    });

    res.json(actorsObj);
  } catch (err) {
    console.error('Error fetching actors:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/actors', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Actor name is required' });
  }

  try {
    const result = await query("INSERT INTO actors (name) VALUES ($1) RETURNING *", [name]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'Actor already exists' });
    }
    console.error('Error creating actor:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/actors/:name', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name } = req.params;
  try {
    await query("DELETE FROM actors WHERE name = $1", [name]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting actor:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Use plays router
app.use('/api/plays', playsRouter);

// Actor availability endpoints
app.post('/api/actor-availability/:actorName/:yearMonth', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { actorName, yearMonth } = req.params;

  try {
    const results = await getAll(
      "SELECT date FROM actor_availability WHERE actor_name = $1 AND SUBSTRING(date, 1, 7) = $2",
      [actorName, yearMonth]
    );

    // Convert to object format {"2025-10-15": true, ...}
    const availability = {};
    results.forEach(row => {
      availability[row.date] = true;
    });

    res.json(availability);
  } catch (err) {
    console.error('Error fetching actor availability:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/actor-availability', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { actorName, date, available } = req.body;

  try {
    if (available) {
      // Add availability
      await query(
        "INSERT INTO actor_availability (actor_name, date) VALUES ($1, $2) ON CONFLICT (actor_name, date) DO NOTHING",
        [actorName, date]
      );
    } else {
      // Remove availability
      await query(
        "DELETE FROM actor_availability WHERE actor_name = $1 AND date = $2",
        [actorName, date]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating actor availability:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/actor-availability', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({});
});

// Planned plays endpoints
app.post('/api/planned-plays/:yearMonth', authenticateToken, async (req, res) => {
  const { yearMonth } = req.params;
  const yearMonthPattern = `${yearMonth}-%`;

  try {
    const rows = await getAll(
      "SELECT date, play_id, play_name FROM planned_plays WHERE date LIKE $1",
      [yearMonthPattern]
    );

    const plannedPlays = {};
    rows.forEach(row => {
      plannedPlays[row.date] = {
        playId: row.play_id,
        playName: row.play_name
      };
    });

    res.json(plannedPlays);
  } catch (err) {
    console.error('Error loading planned plays:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/planned-plays', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date, playId, playName } = req.body;

  try {
    await query(
      `INSERT INTO planned_plays (date, play_id, play_name) VALUES ($1, $2, $3)
       ON CONFLICT (date) DO UPDATE SET play_id = $2, play_name = $3`,
      [date, playId, playName]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving planned play:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/planned-plays/:date', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { date } = req.params;

  try {
    await query("DELETE FROM planned_plays WHERE date = $1", [date]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting planned play:', err);
    return res.status(500).json({ error: 'Database error' });
  }
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

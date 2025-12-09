const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');

const dbPath = path.join(__dirname, '..', 'theater.db');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Initialize database with performances table
const initializeDatabase = () => {
  const db = new sqlite3.Database(dbPath);
  
  db.serialize(() => {
    // Create performances table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS performances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      play_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      venue TEXT,
      notes TEXT,
      casting TEXT, -- JSON string of casting data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (play_id) REFERENCES plays(id) ON DELETE CASCADE
    )`);
  });
  
  db.close();
};

// Initialize database on module load
initializeDatabase();

// GET /api/performances/:yearMonth - Get all performances for a specific month
router.get('/:yearMonth', authenticateToken, (req, res) => {
  const { yearMonth } = req.params;
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM performances WHERE substr(date, 1, 7) = ? ORDER BY date, time', [yearMonth], (err, rows) => {
    if (err) {
      console.error('Error fetching performances:', err);
      return res.status(500).json({ error: 'Failed to fetch performances' });
    }
    
    // Convert rows to the expected format and parse casting JSON
    const performances = {};
    rows.forEach(row => {
      performances[row.id] = {
        id: row.id,
        playId: row.play_id,
        date: row.date,
        time: row.time,
        venue: row.venue,
        notes: row.notes,
        casting: row.casting ? JSON.parse(row.casting) : {},
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    res.json(performances);
  });
  
  db.close();
});

// GET /api/performances/single/:id - Get specific performance
router.get('/single/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const performanceId = req.params.id;
  
  db.get('SELECT * FROM performances WHERE id = ?', [performanceId], (err, row) => {
    if (err) {
      console.error('Error fetching performance:', err);
      return res.status(500).json({ error: 'Failed to fetch performance' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Performance not found' });
    }
    
    const performance = {
      id: row.id,
      playId: row.play_id,
      date: row.date,
      time: row.time,
      venue: row.venue,
      notes: row.notes,
      casting: row.casting ? JSON.parse(row.casting) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    res.json(performance);
  });
  
  db.close();
});

// POST /api/performances - Create new performance
router.post('/', authenticateToken, (req, res) => {
  const { playId, date, time, venue, notes, casting } = req.body;
  
  if (!playId || !date || !time) {
    return res.status(400).json({ error: 'Play ID, date, and time are required' });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if play exists
  db.get('SELECT id FROM plays WHERE id = ?', [playId], (err, row) => {
    if (err) {
      console.error('Error checking play existence:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      db.close();
      return res.status(400).json({ error: 'Play not found' });
    }
    
    // Check for conflicting performances at the same date/time
    db.get('SELECT id FROM performances WHERE date = ? AND time = ?', [date, time], (err, row) => {
      if (err) {
        console.error('Error checking performance conflict:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        db.close();
        return res.status(400).json({ error: 'Another performance is already scheduled at this date and time' });
      }
      
      // Insert new performance
      const stmt = db.prepare(`INSERT INTO performances (play_id, date, time, venue, notes, casting) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run([playId, date, time, venue?.trim() || '', notes?.trim() || '', JSON.stringify(casting || {})], function(err) {
        if (err) {
          console.error('Error creating performance:', err);
          db.close();
          return res.status(500).json({ error: 'Failed to create performance' });
        }
        
        // Fetch the created performance
        db.get('SELECT * FROM performances WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            console.error('Error fetching created performance:', err);
            db.close();
            return res.status(500).json({ error: 'Performance created but failed to fetch' });
          }
          
          const performance = {
            id: row.id,
            playId: row.play_id,
            date: row.date,
            time: row.time,
            venue: row.venue,
            notes: row.notes,
            casting: row.casting ? JSON.parse(row.casting) : {},
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          
          res.status(201).json(performance);
          db.close();
        });
      });
      stmt.finalize();
    });
  });
});

// PUT /api/performances/:id - Update existing performance
router.put('/:id', authenticateToken, (req, res) => {
  const performanceId = req.params.id;
  const { playId, date, time, venue, notes, casting } = req.body;
  
  if (!playId || !date || !time) {
    return res.status(400).json({ error: 'Play ID, date, and time are required' });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if performance exists
  db.get('SELECT id FROM performances WHERE id = ?', [performanceId], (err, row) => {
    if (err) {
      console.error('Error checking performance existence:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      db.close();
      return res.status(404).json({ error: 'Performance not found' });
    }
    
    // Check if play exists
    db.get('SELECT id FROM plays WHERE id = ?', [playId], (err, row) => {
      if (err) {
        console.error('Error checking play existence:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        db.close();
        return res.status(400).json({ error: 'Play not found' });
      }
      
      // Check for conflicting performances at the same date/time (excluding current performance)
      db.get('SELECT id FROM performances WHERE date = ? AND time = ? AND id != ?', [date, time, performanceId], (err, row) => {
        if (err) {
          console.error('Error checking performance conflict:', err);
          db.close();
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (row) {
          db.close();
          return res.status(400).json({ error: 'Another performance is already scheduled at this date and time' });
        }
        
        // Update the performance
        const stmt = db.prepare(`UPDATE performances SET play_id = ?, date = ?, time = ?, venue = ?, notes = ?, casting = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
        stmt.run([playId, date, time, venue?.trim() || '', notes?.trim() || '', JSON.stringify(casting || {}), performanceId], function(err) {
          if (err) {
            console.error('Error updating performance:', err);
            db.close();
            return res.status(500).json({ error: 'Failed to update performance' });
          }
          
          // Fetch the updated performance
          db.get('SELECT * FROM performances WHERE id = ?', [performanceId], (err, row) => {
            if (err) {
              console.error('Error fetching updated performance:', err);
              db.close();
              return res.status(500).json({ error: 'Performance updated but failed to fetch' });
            }
            
            const performance = {
              id: row.id,
              playId: row.play_id,
              date: row.date,
              time: row.time,
              venue: row.venue,
              notes: row.notes,
              casting: row.casting ? JSON.parse(row.casting) : {},
              created_at: row.created_at,
              updated_at: row.updated_at
            };
            
            res.json(performance);
            db.close();
          });
        });
        stmt.finalize();
      });
    });
  });
});

// DELETE /api/performances/:id - Delete performance
router.delete('/:id', authenticateToken, (req, res) => {
  const performanceId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if performance exists
  db.get('SELECT id FROM performances WHERE id = ?', [performanceId], (err, row) => {
    if (err) {
      console.error('Error checking performance existence:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      db.close();
      return res.status(404).json({ error: 'Performance not found' });
    }
    
    // Delete the performance
    const stmt = db.prepare('DELETE FROM performances WHERE id = ?');
    stmt.run([performanceId], function(err) {
      if (err) {
        console.error('Error deleting performance:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to delete performance' });
      }
      
      res.json({ 
        message: 'Performance deleted successfully',
        deletedPerformance: {
          id: performanceId
        }
      });
      db.close();
    });
    stmt.finalize();
  });
});

// GET /api/performances/upcoming - Get upcoming performances
router.get('/upcoming/list', authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  
  const query = `
    SELECT p.*, pl.name as play_name 
    FROM performances p
    LEFT JOIN plays pl ON p.play_id = pl.id
    WHERE p.date >= ?
    ORDER BY p.date, p.time
    LIMIT 50
  `;
  
  db.all(query, [today], (err, rows) => {
    if (err) {
      console.error('Error fetching upcoming performances:', err);
      return res.status(500).json({ error: 'Failed to fetch upcoming performances' });
    }
    
    const performances = rows.map(row => ({
      id: row.id,
      playId: row.play_id,
      playName: row.play_name,
      date: row.date,
      time: row.time,
      venue: row.venue,
      notes: row.notes,
      casting: row.casting ? JSON.parse(row.casting) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    res.json(performances);
  });
  
  db.close();
});

module.exports = router;
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');

const dbPath = path.join(__dirname, '..', 'scheduler.db');

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

// Initialize database with plays table
const initializeDatabase = () => {
  const db = new sqlite3.Database(dbPath);
  
  db.serialize(() => {
    // Create plays table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      characters TEXT, -- JSON string of characters array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
  
  db.close();
};

// Initialize database on module load
initializeDatabase();

// GET /api/plays - Get all plays
router.get('/', authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM plays ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching plays:', err);
      return res.status(500).json({ error: 'Failed to fetch plays' });
    }
    
    // Convert rows to the expected format and parse characters JSON
    const plays = {};
    rows.forEach(row => {
      plays[row.id] = {
        id: row.id,
        name: row.name,
        description: row.description,
        characters: row.characters ? JSON.parse(row.characters) : [],
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    res.json(plays);
  });
  
  db.close();
});

// GET /api/plays/:id - Get specific play
router.get('/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const playId = req.params.id;
  
  db.get('SELECT * FROM plays WHERE id = ?', [playId], (err, row) => {
    if (err) {
      console.error('Error fetching play:', err);
      return res.status(500).json({ error: 'Failed to fetch play' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Play not found' });
    }
    
    const play = {
      id: row.id,
      name: row.name,
      description: row.description,
      characters: row.characters ? JSON.parse(row.characters) : [],
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    res.json(play);
  });
  
  db.close();
});

// POST /api/plays - Create new play
router.post('/', authenticateToken, (req, res) => {
  const { name, description, characters } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Play name is required' });
  }
  
  // Validate characters array
  if (!characters || !Array.isArray(characters)) {
    return res.status(400).json({ error: 'Characters must be an array' });
  }
  
  // Validate each character has required fields
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    if (!character.name || !character.name.trim()) {
      return res.status(400).json({ error: `Character ${i + 1} must have a name` });
    }
    if (!character.actors || !Array.isArray(character.actors)) {
      return res.status(400).json({ error: `Character ${i + 1} must have an actors array` });
    }
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if play with same name already exists
  db.get('SELECT id FROM plays WHERE name = ?', [name.trim()], (err, row) => {
    if (err) {
      console.error('Error checking play name:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      db.close();
      return res.status(400).json({ error: 'Play with this name already exists' });
    }
    
    // Insert new play
    const stmt = db.prepare(`INSERT INTO plays (name, description, characters) VALUES (?, ?, ?)`);
    stmt.run([name.trim(), description?.trim() || '', JSON.stringify(characters)], function(err) {
      if (err) {
        console.error('Error creating play:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to create play' });
      }
      
      // Fetch the created play
      db.get('SELECT * FROM plays WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('Error fetching created play:', err);
          db.close();
          return res.status(500).json({ error: 'Play created but failed to fetch' });
        }
        
        const play = {
          id: row.id,
          name: row.name,
          description: row.description,
          characters: row.characters ? JSON.parse(row.characters) : [],
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        
        res.status(201).json(play);
        db.close();
      });
    });
    stmt.finalize();
  });
});

// PUT /api/plays/:id - Update existing play
router.put('/:id', authenticateToken, (req, res) => {
  const playId = req.params.id;
  const { name, description, characters } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Play name is required' });
  }
  
  // Validate characters array
  if (!characters || !Array.isArray(characters)) {
    return res.status(400).json({ error: 'Characters must be an array' });
  }
  
  // Validate each character has required fields
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    if (!character.name || !character.name.trim()) {
      return res.status(400).json({ error: `Character ${i + 1} must have a name` });
    }
    if (!character.actors || !Array.isArray(character.actors)) {
      return res.status(400).json({ error: `Character ${i + 1} must have an actors array` });
    }
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
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Check if another play with the same name exists
    db.get('SELECT id FROM plays WHERE name = ? AND id != ?', [name.trim(), playId], (err, row) => {
      if (err) {
        console.error('Error checking play name:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        db.close();
        return res.status(400).json({ error: 'Another play with this name already exists' });
      }
      
      // Update the play
      const stmt = db.prepare(`UPDATE plays SET name = ?, description = ?, characters = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run([name.trim(), description?.trim() || '', JSON.stringify(characters), playId], function(err) {
        if (err) {
          console.error('Error updating play:', err);
          db.close();
          return res.status(500).json({ error: 'Failed to update play' });
        }
        
        // Fetch the updated play
        db.get('SELECT * FROM plays WHERE id = ?', [playId], (err, row) => {
          if (err) {
            console.error('Error fetching updated play:', err);
            db.close();
            return res.status(500).json({ error: 'Play updated but failed to fetch' });
          }
          
          const play = {
            id: row.id,
            name: row.name,
            description: row.description,
            characters: row.characters ? JSON.parse(row.characters) : [],
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          
          res.json(play);
          db.close();
        });
      });
      stmt.finalize();
    });
  });
});

// DELETE /api/plays/:id - Delete play
router.delete('/:id', authenticateToken, (req, res) => {
  const playId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if play exists
  db.get('SELECT id, name FROM plays WHERE id = ?', [playId], (err, row) => {
    if (err) {
      console.error('Error checking play existence:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      db.close();
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Delete the play
    const stmt = db.prepare('DELETE FROM plays WHERE id = ?');
    stmt.run([playId], function(err) {
      if (err) {
        console.error('Error deleting play:', err);
        db.close();
        return res.status(500).json({ error: 'Failed to delete play' });
      }
      
      res.json({ 
        message: 'Play deleted successfully',
        deletedPlay: {
          id: playId,
          name: row.name
        }
      });
      db.close();
    });
    stmt.finalize();
  });
});

module.exports = router;
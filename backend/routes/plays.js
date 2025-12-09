const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query, getOne, getAll, pool } = require('../database');

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

// Initialize plays table
const initializePlaysTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS plays (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        characters TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Plays table initialized successfully');
  } catch (err) {
    console.error('Error initializing plays table:', err);
  }
};

// Initialize table on module load
initializePlaysTable();

// GET /api/plays - Get all plays
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await getAll('SELECT * FROM plays ORDER BY created_at DESC');
    
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
  } catch (err) {
    console.error('Error fetching plays:', err);
    return res.status(500).json({ error: 'Failed to fetch plays' });
  }
});

// GET /api/plays/:id - Get specific play
router.get('/:id', authenticateToken, async (req, res) => {
  const playId = req.params.id;
  
  try {
    const row = await getOne('SELECT * FROM plays WHERE id = $1', [playId]);
    
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
  } catch (err) {
    console.error('Error fetching play:', err);
    return res.status(500).json({ error: 'Failed to fetch play' });
  }
});

// POST /api/plays - Create new play
router.post('/', authenticateToken, async (req, res) => {
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
  
  try {
    // Check if play with same name already exists
    const existingPlay = await getOne('SELECT id FROM plays WHERE name = $1', [name.trim()]);
    
    if (existingPlay) {
      return res.status(400).json({ error: 'Play with this name already exists' });
    }
    
    // Insert new play
    const result = await query(
      'INSERT INTO plays (name, description, characters) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description?.trim() || '', JSON.stringify(characters)]
    );
    
    const row = result.rows[0];
    const play = {
      id: row.id,
      name: row.name,
      description: row.description,
      characters: row.characters ? JSON.parse(row.characters) : [],
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    res.status(201).json(play);
  } catch (err) {
    console.error('Error creating play:', err);
    return res.status(500).json({ error: 'Failed to create play' });
  }
});

// PUT /api/plays/:id - Update existing play
router.put('/:id', authenticateToken, async (req, res) => {
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
  
  try {
    // Check if play exists
    const existingPlay = await getOne('SELECT id FROM plays WHERE id = $1', [playId]);
    
    if (!existingPlay) {
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Check if another play with the same name exists
    const duplicateName = await getOne(
      'SELECT id FROM plays WHERE name = $1 AND id != $2',
      [name.trim(), playId]
    );
    
    if (duplicateName) {
      return res.status(400).json({ error: 'Another play with this name already exists' });
    }
    
    // Update the play
    const result = await query(
      'UPDATE plays SET name = $1, description = $2, characters = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name.trim(), description?.trim() || '', JSON.stringify(characters), playId]
    );
    
    const row = result.rows[0];
    const play = {
      id: row.id,
      name: row.name,
      description: row.description,
      characters: row.characters ? JSON.parse(row.characters) : [],
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    res.json(play);
  } catch (err) {
    console.error('Error updating play:', err);
    return res.status(500).json({ error: 'Failed to update play' });
  }
});

// DELETE /api/plays/:id - Delete play
router.delete('/:id', authenticateToken, async (req, res) => {
  const playId = req.params.id;
  
  try {
    // Check if play exists
    const existingPlay = await getOne('SELECT id, name FROM plays WHERE id = $1', [playId]);
    
    if (!existingPlay) {
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Delete the play
    await query('DELETE FROM plays WHERE id = $1', [playId]);
    
    res.json({ 
      message: 'Play deleted successfully',
      deletedPlay: {
        id: playId,
        name: existingPlay.name
      }
    });
  } catch (err) {
    console.error('Error deleting play:', err);
    return res.status(500).json({ error: 'Failed to delete play' });
  }
});

module.exports = router;

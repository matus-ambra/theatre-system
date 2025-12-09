const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#999999',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Actors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS actors (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Actor availability table
    await client.query(`
      CREATE TABLE IF NOT EXISTS actor_availability (
        id SERIAL PRIMARY KEY,
        actor_name TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(actor_name, date),
        FOREIGN KEY (actor_name) REFERENCES actors(name) ON DELETE CASCADE
      )
    `);

    // Planned plays table
    await client.query(`
      CREATE TABLE IF NOT EXISTS planned_plays (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        play_id TEXT NOT NULL,
        play_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Calendar labels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_labels (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        label TEXT NOT NULL,
        workers_needed INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Worker assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS worker_assignments (
        id SERIAL PRIMARY KEY,
        calendar_label_id INTEGER REFERENCES calendar_labels(id) ON DELETE CASCADE,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Query helper function
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Get a single row
async function getOne(text, params) {
  const result = await query(text, params);
  return result.rows[0];
}

// Get all rows
async function getAll(text, params) {
  const result = await query(text, params);
  return result.rows;
}

module.exports = {
  pool,
  query,
  getOne,
  getAll,
  initializeDatabase
};

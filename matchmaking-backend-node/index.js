require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Read env variables
const {
  PORT,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME
} = process.env;

// Create PostgreSQL connection pool
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME
});

// Ensure 'users' table exists (simple approach - no migrations)
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    origin VARCHAR(100) NOT NULL
  )
`;

pool.query(createTableQuery)
  .then(() => console.log("Users table ready"))
  .catch(err => console.error("Error creating table:", err));

// Route: Create a user profile
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, mobile_number, batch, origin } = req.body;
    if (!name || !email || !mobile_number || !batch || !origin) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const insertQuery = `
      INSERT INTO users (name, email, mobile_number, batch, origin)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [name, email, mobile_number, batch, origin];
    const result = await pool.query(insertQuery, values);

    res.status(201).json({ message: "Profile created", user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error creating profile" });
  }
});

// Route: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

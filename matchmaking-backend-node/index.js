require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { Pool } = require("pg");
const CasAuthentication = require("cas-authentication");

const app = express();
app.use(express.json());
app.use(cors());

// Session management for storing CAS session info
app.use(
  session({
    secret: "some-random-secret", // Change this in production!
    resave: false,
    saveUninitialized: true,
  })
);

// Configure CAS using cas-authentication (using the base URL)
const cas = new CasAuthentication({
  cas_url: "https://login.iiit.ac.in/cas",
  service_url: "http://localhost:5000", // Base URL
  cas_version: "3.0",
});

// Read environment variables
const {
  PORT = 5000,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env;

// Create PostgreSQL connection pool
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
});

// Create the "users" table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    mobile_number VARCHAR(20),
    batch VARCHAR(50),
    origin VARCHAR(100),
    form_filled BOOLEAN DEFAULT false
  );
`;

pool
  .query(createTableQuery)
  .then(() => console.log("Users table ready"))
  .catch((err) => console.error("Error creating table:", err));

/**
 * CAS LOGIN ROUTE
 * - Uses cas.bounce to enforce CAS authentication.
 * - After successful login, it retrieves the user email from session.
 * - It performs a case-insensitive lookup in the database.
 * - Debug logs are added to see what CAS returns and what the DB query finds.
 */
app.get("/cas-login", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name]; // typically the user's email
  console.log("CAS user from session:", casUser);
  if (!casUser) {
    return res.status(401).send("CAS authentication failed");
  }

  try {
    // Use lower() to make the email comparison case-insensitive
    const query = "SELECT * FROM users WHERE lower(email) = lower($1)";
    const result = await pool.query(query, [casUser]);
    console.log("DB query result:", result.rows);

    if (result.rows.length === 0) {
      // No profile exists → redirect to the create profile page on your React frontend.
      return res.redirect("http://localhost:3000/create-profile");
    } else {
      const user = result.rows[0];
      if (user.form_filled) {
        // If the form is already filled, redirect to the results page.
        return res.redirect("http://localhost:3000/results");
      } else {
        // Otherwise, redirect to the fill form page.
        return res.redirect("http://localhost:3000/fill-form");
      }
    }
  } catch (error) {
    console.error("Error during CAS login process:", error);
    return res.status(500).send("Internal Server Error during CAS login");
  }
});

/**
 * CREATE PROFILE Endpoint
 * - Protected by CAS: uses cas.bounce.
 * - Uses the CAS email from the session (ignoring any email in the request body).
 */
app.post("/api/users", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  console.log("Creating profile for CAS user:", casUser);
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }

  try {
    const { name, mobile_number, batch, origin } = req.body;
    if (!name || !mobile_number || !batch || !origin) {
      return res.status(400).json({ error: "All fields are required (except email)" });
    }
    const insertQuery = `
      INSERT INTO users (email, name, mobile_number, batch, origin, form_filled)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *;
    `;
    const values = [casUser, name, mobile_number, batch, origin];
    const result = await pool.query(insertQuery, values);
    console.log("Profile created:", result.rows[0]);
    return res.status(201).json({ message: "Profile created", profile: result.rows[0] });
  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({ error: "Server error creating profile" });
  }
});

/**
 * FILL FORM Endpoint
 * - Protected by CAS: uses cas.bounce.
 * - Marks the profile as form_filled.
 */
app.post("/api/fill-form", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  console.log("Filling form for CAS user:", casUser);
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }

  try {
    const updateQuery = `
      UPDATE users
      SET form_filled = true
      WHERE lower(email) = lower($1)
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [casUser]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("Form marked as filled for user:", result.rows[0]);
    return res.json({ message: "Form filled", profile: result.rows[0] });
  } catch (error) {
    console.error("Error filling form:", error);
    return res.status(500).json({ error: "Server error filling form" });
  }
});

/**
 * RESULTS Endpoint
 * - Returns dummy match data.
 */
app.get("/api/results", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }

  try {
    const matches = [
      { match: "John Doe", percentage: 90 },
      { match: "Jane Smith", percentage: 85 },
      { match: "Alex Johnson", percentage: 80 },
    ];
    return res.json({ email: casUser, matches });
  } catch (error) {
    console.error("Error fetching results:", error);
    return res.status(500).json({ error: "Server error fetching results" });
  }
});

// Optional: Debug endpoint to view all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Server error fetching users" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

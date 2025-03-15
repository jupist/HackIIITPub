require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { Pool } = require("pg");
const CasAuthentication = require("cas-authentication");

const app = express(); // Initialize the Express app

app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// Set up session management for CAS
app.use(
  session({
    secret: "some-random-secret", // change this in production!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set to true if using HTTPS
  })
);

// Configure CAS using cas-authentication with the base URL
const cas = new CasAuthentication({
  cas_url: "https://login.iiit.ac.in/cas",
  service_url: "http://localhost:5000", // base URL (do not include path)
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
const createUsersTableQuery = `
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

// Create the "forms" table for storing form responses
const createFormsTableQuery = `
  CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createUsersTableQuery)
  .then(() => console.log("Users table ready"))
  .catch((err) => console.error("Error creating users table:", err));

pool.query(createFormsTableQuery)
  .then(() => console.log("Forms table ready"))
  .catch((err) => console.error("Error creating forms table:", err));

/**
 * CAS LOGIN ROUTE
 * - Enforces CAS authentication.
 * - Retrieves the CAS email from the session.
 * - Looks up the user (case-insensitive) in the users table.
 * - Redirects to the appropriate React page with the email as a query parameter.
 */
app.get("/cas-login", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name]; // typically CAS returns an email
  console.log("CAS user from session:", casUser);
  if (!casUser) {
    return res.status(401).send("CAS authentication failed");
  }

  try {
    const query = "SELECT * FROM users WHERE lower(email) = lower($1)";
    const result = await pool.query(query, [casUser]);
    console.log("DB query result:", result.rows);
    if (result.rows.length === 0) {
      // No profile exists: redirect to create-profile page with CAS email
      return res.redirect("http://localhost:3000/create-profile?email=" + encodeURIComponent(casUser));
    } else {
      const user = result.rows[0];
      if (user.form_filled) {
        // Form already filled: redirect to results page with CAS email
        return res.redirect("http://localhost:3000/results?email=" + encodeURIComponent(casUser));
      } else {
        // Profile exists but form not filled: redirect to fill-form page with CAS email
        return res.redirect("http://localhost:3000/fill-form?email=" + encodeURIComponent(casUser));
      }
    }
  } catch (error) {
    console.error("Error during CAS login process:", error);
    return res.status(500).send("Internal Server Error during CAS login");
  }
});

/**
 * CREATE PROFILE Endpoint
 * - Protected by CAS.
 * - Uses the CAS-provided email from the session.
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
 * FORM SUBMISSION Endpoint
 * - Protected by CAS.
 * - Inserts form responses into the forms table and updates the user's profile (form_filled = true).
 */
app.post("/api/forms", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  console.log("Storing form submission for CAS user:", casUser);
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }
  try {
    // Look up the user's id in the users table (case-insensitive lookup)
    const userQuery = "SELECT id FROM users WHERE lower(email) = lower($1)";
    const userResult = await pool.query(userQuery, [casUser]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    // Get the form answers from the request body
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ error: "Form answers are required" });
    }

    // Insert form answers into the forms table
    const insertFormQuery = `
      INSERT INTO forms (user_id, answers)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const formResult = await pool.query(insertFormQuery, [userId, JSON.stringify(answers)]);

    // Update the user's form_filled flag to true
    const updateUserQuery = `
      UPDATE users
      SET form_filled = true
      WHERE id = $1
      RETURNING *;
    `;
    const updateResult = await pool.query(updateUserQuery, [userId]);

    console.log("Form submission stored for user:", updateResult.rows[0]);
    return res.json({ message: "Form submitted", form: formResult.rows[0], user: updateResult.rows[0] });
  } catch (error) {
    console.error("Error submitting form:", error);
    return res.status(500).json({ error: "Server error submitting form" });
  }
});

/**
 * RESULTS Endpoint
 * - Protected by CAS.
 * - Returns dummy match data (replace with actual matching algorithm later).
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

// Optional debugging endpoints
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Server error fetching users" });
  }
});

app.get("/api/forms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM forms");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({ error: "Server error fetching forms" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

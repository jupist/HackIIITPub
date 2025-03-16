const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } // Needed for Railway DB
});

client.connect()
  .then(() => console.log("Connected to Railway DB!"))
  .catch(err => console.error("Connection error", err));

module.exports = client; // Export for use in other files


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
    branch VARCHAR(50),
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
    const { name, mobile_number, batch, branch, origin } = req.body;
    if (!name || !mobile_number || !batch || !branch || !origin) {
      return res.status(400).json({ error: "All fields are required (except email)" });
    }
    const insertQuery = `
      INSERT INTO users (email, name, mobile_number, batch, branch, origin, form_filled)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING *;
    `;
    const values = [casUser, name, mobile_number, batch, branch, origin];
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
 * - Uses a personality-based matchmaking algorithm to compute match percentages.
 * - Returns matches above 30% with each match's name, email, mobile number, origin, and batch.
 */
app.get("/api/results", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }
  try {
    // 1. Get current user's ID
    const userQuery = "SELECT id FROM users WHERE lower(email) = lower($1)";
    const userResult = await pool.query(userQuery, [casUser]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentUserId = userResult.rows[0].id;

    // 2. Retrieve current user's form answers
    const formQuery = "SELECT answers FROM forms WHERE user_id = $1";
    const formResult = await pool.query(formQuery, [currentUserId]);
    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: "Form not submitted" });
    }
    const currentUserAnswers = formResult.rows[0].answers;

    // 3. Retrieve all other users' form answers along with profile data
    const otherFormsQuery = `
      SELECT f.answers, u.email, u.name, u.mobile_number, u.origin, u.batch, u.branch
      FROM forms f
      JOIN users u ON f.user_id = u.id
      WHERE u.id != $1
    `;
    const otherFormsResult = await pool.query(otherFormsQuery, [currentUserId]);
    const otherUsers = otherFormsResult.rows;

    // 4. Define the mapping for each question’s answer to personality type points.
    const personalityMapping = {
      q1: {
        A: { overthinker: 0, impulsive: 10, DGAF: 5, childish: 0 },
        B: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 0 },
        C: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 5 },
        D: { overthinker: 5, impulsive: 0, DGAF: 2, childish: 10 },
      },
      q2: {
        A: { overthinker: 2, impulsive: 10, DGAF: 0, childish: 5 },
        B: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 0 },
        C: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 5 },
        D: { overthinker: 0, impulsive: 10, DGAF: 5, childish: 0 },
      },
      q3: {
        A: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 0 },
        B: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 2 },
        C: { overthinker: 0, impulsive: 5, DGAF: 10, childish: 0 },
        D: { overthinker: 10, impulsive: 0, DGAF: 0, childish: 10 },
      },
      q4: {
        A: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 5 },
        B: { overthinker: 5, impulsive: 0, DGAF: 0, childish: 0 },
        C: { overthinker: 10, impulsive: 0, DGAF: 10, childish: 0 },
        D: { overthinker: 10, impulsive: 0, DGAF: 0, childish: 0 },
      },
      q5: {
        A: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 0 },
        B: { overthinker: 0, impulsive: 5, DGAF: 0, childish: 5 },
        C: { overthinker: 0, impulsive: 0, DGAF: 0, childish: 0 },
        D: { overthinker: 10, impulsive: 0, DGAF: 10, childish: 0 },
      },
      q6: {
        A: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 5 },
        B: { overthinker: 10, impulsive: 0, DGAF: 10, childish: 0 },
        C: { overthinker: 5, impulsive: 0, DGAF: 0, childish: 0 },
        D: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 10 },
      },
      q7: {
        A: { overthinker: 0, impulsive: 5, DGAF: 0, childish: 10 },
        B: { overthinker: 0, impulsive: 10, DGAF: 5, childish: 0 },
        C: { overthinker: 5, impulsive: 0, DGAF: 0, childish: 0 },
        D: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 0 },
      },
      q8: {
        A: { overthinker: 10, impulsive: 0, DGAF: 5, childish: 0 },
        B: { overthinker: 10, impulsive: 0, DGAF: 0, childish: 0 },
        C: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 5 },
        D: { overthinker: 0, impulsive: 0, DGAF: 10, childish: 10 },
      },
      q9: {
        A: { overthinker: 0, impulsive: 10, DGAF: 0, childish: 10 },
        B: { overthinker: 10, impulsive: 0, DGAF: 0, childish: 0 },
        C: { overthinker: 5, impulsive: 0, DGAF: 5, childish: 0 },
        D: { overthinker: 15, impulsive: 0, DGAF: 5, childish: 0 },
      },
      q10: {
        A: { overthinker: 0, impulsive: 5, DGAF: 0, childish: 10 },
        B: { overthinker: 5, impulsive: 0, DGAF: 5, childish: 0 },
        C: { overthinker: 0, impulsive: 5, DGAF: 10, childish: 5 },
        D: { overthinker: 10, impulsive: 0, DGAF: 10, childish: 0 },
      },
    };

    // 5. Function to compute a personality profile from form answers.
    const computePersonalityProfile = (answers) => {
      const profile = { overthinker: 0, impulsive: 0, DGAF: 0, childish: 0 };
      for (let q in personalityMapping) {
        const answer = answers[q];
        if (answer && personalityMapping[q][answer]) {
          const points = personalityMapping[q][answer];
          profile.overthinker += points.overthinker;
          profile.impulsive += points.impulsive;
          profile.DGAF += points.DGAF;
          profile.childish += points.childish;
        }
      }
      return profile;
    };

    // 6. Compute current user's personality profile
    const currentProfile = computePersonalityProfile(currentUserAnswers);

    // 7. Precomputed maximum possible total difference across all categories
    const maxTotalDifference = 350; // Calculated from the personality mapping

    // 8. Compute matches based on category points
    const matches = otherUsers.map((other) => {
      const otherProfile = computePersonalityProfile(other.answers);
      
      // Calculate total difference in points across all categories
      let totalDifference = 0;
      totalDifference += Math.abs(currentProfile.overthinker - otherProfile.overthinker);
      totalDifference += Math.abs(currentProfile.impulsive - otherProfile.impulsive);
      totalDifference += Math.abs(currentProfile.DGAF - otherProfile.DGAF);
      totalDifference += Math.abs(currentProfile.childish - otherProfile.childish);

      // Calculate match percentage
      const percentage = Math.round(100 - (totalDifference / maxTotalDifference) * 100);
      const clampedPercentage = Math.max(0, Math.min(100, percentage));

      return {
        name: other.name || other.email,
        email: other.email,
        mobile_number: other.mobile_number,
        origin: other.origin,
        batch: other.batch,
        branch: other.branch,
        percentage: clampedPercentage,
      };
    });

    // 9. Sort matches and filter for those above 30%
    matches.sort((a, b) => b.percentage - a.percentage);
    const filteredMatches = matches.filter(match => match.percentage > 30);

    return res.json({ email: casUser, matches: filteredMatches });
  } catch (error) {
    console.error("Error during personality matchmaking:", error);
    return res.status(500).json({ error: "Server error during matchmaking" });
  }
});

/**
 * Debugging Endpoints
 */
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

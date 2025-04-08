require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const CasAuthentication = require("cas-authentication");

const app = express();

app.use(express.json());

// Updated CORS configuration for deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-url.vercel.app', 'http://localhost:3000'] 
    : 'http://localhost:3000',
  credentials: true,
}));

// Set up session management with more secure configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "some-random-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Required for cross-site cookies
    },
  })
);

// Configure CAS with environment-aware service URL
const cas = new CasAuthentication({
  cas_url: "https://login.iiit.ac.in/cas",
  service_url: process.env.NODE_ENV === 'production' 
    ? "https://hackiiitpub.onrender.com" // Your actual Render URL
    : "http://localhost:5000",
  cas_version: "3.0",
});

// Read environment variables
const { PORT = 5000, NODE_ENV } = process.env;
let { MONGODB_URI } = process.env;

// In Render, sometimes quotes get included in the environment variable
if (MONGODB_URI && (MONGODB_URI.startsWith('"') || MONGODB_URI.startsWith("'"))) {
  MONGODB_URI = MONGODB_URI.substring(1, MONGODB_URI.length - 1);
  console.log("Fixed MongoDB URI by removing quotes");
}

// Log the MongoDB URI (for debugging - remove in production)
console.log("Attempting to connect to MongoDB with URI:", 
  MONGODB_URI ? (MONGODB_URI.substring(0, 15) + "...") : "URI is missing");

// Connect to MongoDB with more robust error handling
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    console.error("Please make sure MongoDB is running and your .env file contains a valid MONGODB_URI");
    process.exit(1); // Exit the process on connection failure
  });

// Define MongoDB Schemas
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  mobile_number: { type: String, required: true },
  batch: { type: String, required: true },
  branch: { type: String, required: true },
  origin: { type: String, required: true },
  form_filled: { type: Boolean, default: false }
});

const FormSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  answers: { type: Object, required: true },
  created_at: { type: Date, default: Date.now }
});

// Create models
const User = model('User', UserSchema);
const Form = model('Form', FormSchema);

/**
 * CAS LOGIN ROUTE
 * - Enforces CAS authentication.
 * - Retrieves the CAS email from the session.
 * - Looks up the user in the users collection.
 * - Redirects to the appropriate React page with the email as a query parameter.
 */
app.get("/cas-login", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name]; // typically CAS returns an email
  console.log("CAS user from session:", casUser);
  if (!casUser) {
    return res.status(401).send("CAS authentication failed");
  }

  try {
    const user = await User.findOne({ email: casUser.toLowerCase() });
    console.log("DB query result:", user);
    
    // Frontend URL based on environment
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://your-frontend-url.vercel.app'  // Update this when you deploy your frontend
      : 'http://localhost:3000';
    
    if (!user) {
      // No profile exists: redirect to create-profile page with CAS email
      return res.redirect(`${frontendURL}/create-profile?email=${encodeURIComponent(casUser)}`);
    } else {
      if (user.form_filled) {
        // Form already filled: redirect to results page with CAS email
        return res.redirect(`${frontendURL}/results?email=${encodeURIComponent(casUser)}`);
      } else {
        // Profile exists but form not filled: redirect to fill-form page with CAS email
        return res.redirect(`${frontendURL}/fill-form?email=${encodeURIComponent(casUser)}`);
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
    
    const newUser = new User({
      email: casUser.toLowerCase(),
      name,
      mobile_number,
      batch,
      branch,
      origin,
      form_filled: false
    });
    
    const savedUser = await newUser.save();
    console.log("Profile created:", savedUser);
    return res.status(201).json({ message: "Profile created", profile: savedUser });
  } catch (error) {
    console.error("Error creating profile:", error);
    if (error.code === 11000) { // MongoDB duplicate key error
      return res.status(409).json({ error: "User with this email already exists" });
    }
    return res.status(500).json({ error: "Server error creating profile" });
  }
});

/**
 * FORM SUBMISSION Endpoint
 * - Protected by CAS.
 * - Inserts form responses into the forms collection and updates the user's profile (form_filled = true).
 */
app.post("/api/forms", cas.bounce, async (req, res) => {
  const casUser = req.session[cas.session_name];
  console.log("Storing form submission for CAS user:", casUser);
  if (!casUser) {
    return res.status(401).json({ error: "No CAS user found" });
  }
  
  try {
    // Look up the user in the users collection
    const user = await User.findOne({ email: casUser.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get the form answers from the request body
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ error: "Form answers are required" });
    }

    // Create and save the new form
    const newForm = new Form({
      user_id: user._id,
      answers
    });
    const savedForm = await newForm.save();

    // Update the user's form_filled flag to true
    user.form_filled = true;
    const updatedUser = await user.save();

    console.log("Form submission stored for user:", updatedUser);
    return res.json({ message: "Form submitted", form: savedForm, user: updatedUser });
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
    // 1. Get current user
    const currentUser = await User.findOne({ email: casUser.toLowerCase() });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Retrieve current user's form answers
    const currentUserForm = await Form.findOne({ user_id: currentUser._id });
    if (!currentUserForm) {
      return res.status(404).json({ error: "Form not submitted" });
    }
    const currentUserAnswers = currentUserForm.answers;

    // 3. Retrieve all other users' form answers along with profile data
    const otherForms = await Form.find().populate({
      path: 'user_id',
      match: { _id: { $ne: currentUser._id } },
      select: 'email name mobile_number origin batch branch'
    }).exec();
    
    // Filter out forms where user_id is null (due to match condition)
    const validOtherForms = otherForms.filter(form => form.user_id !== null);

    // 4. Define the mapping for each question's answer to personality type points.
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
    const matches = validOtherForms.map((otherForm) => {
      const otherProfile = computePersonalityProfile(otherForm.answers);
      const otherUser = otherForm.user_id;
      
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
        name: otherUser.name || otherUser.email,
        email: otherUser.email,
        mobile_number: otherUser.mobile_number,
        origin: otherUser.origin,
        batch: otherUser.batch,
        branch: otherUser.branch,
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
    const users = await User.find({});
    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Server error fetching users" });
  }
});

app.get("/api/forms", async (req, res) => {
  try {
    const forms = await Form.find({}).populate('user_id', 'email name');
    return res.json(forms);
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({ error: "Server error fetching forms" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Frontend URL: http://localhost:3000`);
  console.log(`- Backend URL: http://localhost:${PORT}`);
  console.log(`- CAS Login: http://localhost:${PORT}/cas-login`);
});

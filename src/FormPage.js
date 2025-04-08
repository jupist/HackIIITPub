import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API_URL from './config';

const FormPage = () => {
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [answers, setAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: "",
    q7: "",
    q8: "",
    q9: "",
    q10: "",
  });

  const handleChange = (e) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("FormPage: Submitting form with", { email: casEmail, answers });

    try {
      const response = await fetch(`${API_URL}/api/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send cookies along with request
        body: JSON.stringify({ email: casEmail, answers }),
      });
      console.log("FormPage: Response status", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Failed to submit form: " + errorText);
      }
      const data = await response.json();
      console.log("FormPage: Form submitted successfully:", data);
      // Redirect to results page
      navigate(`/results?email=${encodeURIComponent(casEmail)}`);
    } catch (error) {
      console.error("FormPage: Error submitting form:", error);
    }
  };

  return (
    <div className="container form-page">
      <div className="card">
        <h2>Fill Out the Form</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Q1) How do you prefer to spend your free time?</label>
            <select name="q1" value={answers.q1} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Partying and socializing</option>
              <option value="B">Watching movies or reading books</option>
              <option value="C">Exploring new places or traveling</option>
              <option value="D">Playing video games or engaging in hobbies</option>
            </select>
          </div>

          <div>
            <label>Q2) What kind of clubs would you want to join?</label>
            <select name="q2" value={answers.q2} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">The Creatives & Performers 🎭🎶🎨</option>
              <option value="B">The Intellectuals & Strategists 🧠📚♟️</option>
              <option value="C">The Innovators & Builders 🛠️🤖💻</option>
              <option value="D">The Adventurers & Socialites 🏄‍♂️⚽🏳️‍🌈</option>
            </select>
          </div>

          <div>
            <label>Q3) What kind of movies do you enjoy the most?</label>
            <select name="q3" value={answers.q3} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Action and thriller</option>
              <option value="B">Comedy and romance</option>
              <option value="C">Horror and mystery</option>
              <option value="D">Sci-fi and fantasy</option>
            </select>
          </div>

          <div>
            <label>Q4) How do you feel about trying new things?</label>
            <select name="q4" value={answers.q4} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Love it! Always up for an adventure</option>
              <option value="B">Open to it, but depends on what it is</option>
              <option value="C">Prefer to stick to what I know</option>
              <option value="D">Only if someone convinces me</option>
            </select>
          </div>

          <div>
            <label>Q5) How do you prefer to communicate with friends?</label>
            <select name="q5" value={answers.q5} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Texting all the time</option>
              <option value="B">Calling or voice messages</option>
              <option value="C">Meeting in person when possible</option>
              <option value="D">Social media interactions</option>
            </select>
          </div>

          <div>
            <label>Q6) What’s your ideal way to spend a weekend?</label>
            <select name="q6" value={answers.q6} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Going out with friends and partying</option>
              <option value="B">Watching movies or gaming at home</option>
              <option value="C">Doing something productive or learning a new skill</option>
              <option value="D">Exploring nature or traveling</option>
            </select>
          </div>

          <div>
            <label>Q7) What type of music do you enjoy the most?</label>
            <select name="q7" value={answers.q7} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Pop, hip-hop, or dance music</option>
              <option value="B">Rock, alternative, or indie music</option>
              <option value="C">Classical, jazz, or instrumental</option>
              <option value="D">Lo-fi, electronic, or experimental music</option>
            </select>
          </div>

          <div>
            <label>Q8) What kind of environment helps you focus?</label>
            <select name="q8" value={answers.q8} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">A quiet space, no distractions</option>
              <option value="B">A cozy coffee shop with light noise</option>
              <option value="C">Loud music or a busy environment</option>
              <option value="D">Doesn’t matter—I procrastinate anyway</option>
            </select>
          </div>

          <div>
            <label>Q9) If someone texts you, how fast do you reply?</label>
            <select name="q9" value={answers.q9} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Instantly, unless I’m super busy</option>
              <option value="B">Within a few hours</option>
              <option value="C">Whenever I remember</option>
              <option value="D">I read it and forget to respond</option>
            </select>
          </div>

          <div>
            <label>Q10) How do you usually wake up in the morning?</label>
            <select name="q10" value={answers.q10} onChange={handleChange} required>
              <option value="">Select an option</option>
              <option value="A">Alarm goes off, and I get up immediately</option>
              <option value="B">Hit snooze a few times before getting up</option>
              <option value="C">Wake up naturally, no alarm needed</option>
              <option value="D">Struggle to get out of bed every single day</option>
            </select>
          </div>

          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormPage;
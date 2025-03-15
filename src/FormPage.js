import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

const FormPage = () => {
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || "";
  const [answers, setAnswers] = useState({});

  const handleChange = (e) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/fill-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: casEmail, answers }),
      });
      if (!response.ok) {
        throw new Error("Failed to fill form");
      }
      const data = await response.json();
      console.log("Form filled:", data);
      window.location.href = "http://localhost:3000/results?email=" + encodeURIComponent(casEmail);
    } catch (error) {
      console.error("Error filling form:", error);
    }
  };

  return (
    <div className="container form-page">
      <div className="card">
        <h2>Fill Out the Form</h2>
        <input
          type="text"
          name="q1"
          placeholder="What are your hobbies?"
          className="input"
          onChange={handleChange}
        />
        <input
          type="text"
          name="q2"
          placeholder="What type of people do you get along with?"
          className="input"
          onChange={handleChange}
        />
        <input
          type="text"
          name="q3"
          placeholder="What are your favorite activities?"
          className="input"
          onChange={handleChange}
        />
        <select name="batchPreference" className="input" onChange={handleChange}>
          <option value="same">Match with same batch</option>
          <option value="all">Match with all batches</option>
        </select>
        <button className="button" onClick={handleSubmit}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default FormPage;

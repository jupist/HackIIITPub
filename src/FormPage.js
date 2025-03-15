import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const FormPage = () => {
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [answers, setAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
    batchPreference: "same",
  });

  const handleChange = (e) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("FormPage: Submitting form with", { email: casEmail, answers });

    try {
      const response = await fetch("http://localhost:5000/api/forms", {
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
          <input
            type="text"
            name="q1"
            placeholder="What are your hobbies?"
            className="input"
            value={answers.q1}
            onChange={handleChange}
          />
          <input
            type="text"
            name="q2"
            placeholder="What type of people do you get along with?"
            className="input"
            value={answers.q2}
            onChange={handleChange}
          />
          <input
            type="text"
            name="q3"
            placeholder="What are your favorite activities?"
            className="input"
            value={answers.q3}
            onChange={handleChange}
          />
          <select
            name="batchPreference"
            className="input"
            value={answers.batchPreference}
            onChange={handleChange}
          >
            <option value="same">Match with same batch</option>
            <option value="all">Match with all batches</option>
          </select>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormPage;

import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const App = () => {
  const [profileCreated, setProfileCreated] = useState(false);
  const [formFilled, setFormFilled] = useState(false);
  const [formData, setFormData] = useState(null);

  return (
    <Router>
      <Routes>
        {!profileCreated ? (
          <Route
            path="/*"
            element={<CreateProfile onCreate={() => setProfileCreated(true)} />}
          />
        ) : !formFilled ? (
          <Route
            path="/*"
            element={
              <FormPage
                onSubmit={(data) => {
                  setFormData(data);
                  setFormFilled(true);
                }}
              />
            }
          />
        ) : (
          <Route path="/*" element={<ResultPage formData={formData} />} />
        )}
      </Routes>
    </Router>
  );
};

const CreateProfile = ({ onCreate }) => {
  return (
    <div className="container profile-page">
      <div className="card">
        <h2>Create Your Profile</h2>
        <input type="text" placeholder="Full Name" className="input" />
        <input type="email" placeholder="Mail ID" className="input" />
        <input type="text" placeholder="Phone Number" className="input" />
        <input type="text" placeholder="Username" className="input" />
        <input type="text" placeholder="Batch" className="input" />
        <input type="text" placeholder="Place of Origin" className="input" />
        <button className="button" onClick={onCreate}>
          Create Profile
        </button>
      </div>
    </div>
  );
};

const FormPage = ({ onSubmit }) => {
  const [answers, setAnswers] = useState({});

  const handleChange = (e) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
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
        <button className="button" onClick={() => onSubmit(answers)}>
          Submit
        </button>
      </div>
    </div>
  );
};

const ResultPage = ({ formData }) => {
  return (
    <div className="container result-page">
      <div className="card">
        <h2>Matched Profiles</h2>
        <p>
          <strong>Match 1:</strong> 90% - John Doe (Batch 2023)
        </p>
        <p>
          <strong>Match 2:</strong> 85% - Jane Smith (Batch 2024)
        </p>
        <p>
          <strong>Match 3:</strong> 80% - Alex Johnson (Batch 2023)
        </p>
      </div>
    </div>
  );
};

export default App;

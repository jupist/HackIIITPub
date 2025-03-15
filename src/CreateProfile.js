import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

const CreateProfile = () => {
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || ""; // CAS email passed by the backend
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [origin, setOrigin] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const profileData = {
      // We send the CAS email, so user cannot change it.
      email: casEmail,
      name,
      mobile_number: mobileNumber,
      batch,
      origin,
    };

    try {
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!response.ok) {
        throw new Error("Failed to create profile");
      }
      const data = await response.json();
      console.log("Profile created:", data);
      // After creating a profile, redirect to the fill form page.
      window.location.href = "http://localhost:3000/fill-form?email=" + encodeURIComponent(casEmail);
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  return (
    <div className="container profile-page">
      <div className="card">
        <h2>Create Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Mail ID"
            className="input"
            value={casEmail}
            readOnly
          />
          <input
            type="text"
            placeholder="Phone Number"
            className="input"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
          <input
            type="text"
            placeholder="Batch"
            className="input"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
          <input
            type="text"
            placeholder="Place of Origin"
            className="input"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <button type="submit" className="button">
            Create Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProfile;

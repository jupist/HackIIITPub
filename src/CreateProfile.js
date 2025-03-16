import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

const CreateProfile = () => {
  const [searchParams] = useSearchParams();
  // CAS email should be passed as a query parameter
  const casEmail = searchParams.get("email") || "";
  const [formData, setFormData] = useState({
    name: "",
    mobile_number: "",
    batch: "",
    origin: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("CreateProfile: Submitting profile for", casEmail, formData);
    const profileData = { ...formData, email: casEmail };

    try {
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send cookies (session)
        body: JSON.stringify(profileData),
      });
      console.log("CreateProfile: Response status", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Failed to create profile: " + errorText);
      }
      const data = await response.json();
      console.log("CreateProfile: Profile created:", data);
      // Redirect to fill-form page after successful profile creation
      window.location.href =
        "http://localhost:3000/fill-form?email=" + encodeURIComponent(casEmail);
    } catch (error) {
      console.error("CreateProfile: Error creating profile:", error);
    }
  };

  return (
    <div className="container create-profile">
      <div className="card">
        <h2>Create Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="input"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Mail ID"
            className="input"
            value={casEmail}
            readOnly
          />
          <input
            type="text"
            name="mobile_number"
            placeholder="Mobile Number"
            className="input"
            value={formData.mobile_number}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="batch"
            placeholder="Batch"
            className="input"
            value={formData.batch}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="origin"
            placeholder="Place of Origin"
            className="input"
            value={formData.origin}
            onChange={handleChange}
            required
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
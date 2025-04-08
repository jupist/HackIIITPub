import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API_URL from "./config";

const ResultPage = () => {
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || "";

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/results?email=${encodeURIComponent(casEmail)}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }
        const data = await response.json();
        setResults(data.matches || []);
      } catch (error) {
        console.error("ResultPage: Error fetching results:", error);
      }
    };
    fetchResults();
  }, [casEmail]);

  const nextMatch = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % results.length);
  };

  const prevMatch = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + results.length) % results.length);
  };

  if (!results.length) {
    return <p>Loading results...</p>;
  }

  const currentMatch = results[currentIndex];

  return (
    <div className="container result-page">
      <div className="card">
        <h2>Matches for You</h2>
        <div className="match-card">
          <h3>{currentMatch.name}</h3>
          <p><strong>Email:</strong> {currentMatch.email}</p>
          <p><strong>Mobile Number:</strong> {currentMatch.mobile_number}</p>
          <p><strong>Joining Year:</strong> {currentMatch.batch}</p>
          <p><strong>Branch:</strong> {currentMatch.branch}</p>
          <p><strong>Origin:</strong> {currentMatch.origin}</p>
          <p><strong>Match Percentage:</strong> {currentMatch.percentage}%</p>
        </div>
        <div className="arrow-buttons">
          <button onClick={prevMatch}>⬅ Prev</button>
          <button onClick={nextMatch}>Next ➡</button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
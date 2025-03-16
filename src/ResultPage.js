import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ResultPage = () => {
  const [results, setResults] = useState(null);
  const [searchParams] = useSearchParams();
  const casEmail = searchParams.get("email") || "";

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/results?email=${encodeURIComponent(casEmail)}`,
          {
            credentials: "include", // include cookies
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }
        const data = await response.json();
        console.log("ResultPage: Fetched results:", data);
        setResults(data);
      } catch (error) {
        console.error("ResultPage: Error fetching results:", error);
      }
    };
    fetchResults();
  }, [casEmail]);

  if (!results) {
    return <p>Loading results...</p>;
  }

  return (
    <div className="container result-page">
      <div className="card">
        <h2>Matched Profiles</h2>
        {results.matches && results.matches.length > 0 ? (
          <div>
            {results.matches.map((match, index) => (
              <div key={index} className="match-card" style={{ marginBottom: "20px" }}>
                <h3>{match.name}</h3>
                <p><strong>Email:</strong> {match.email}</p>
                <p><strong>Mobile Number:</strong> {match.mobile_number}</p>
                <p><strong>Joining year:</strong> {match.batch}</p>
                <p><strong>Branch:</strong> {match.branch}</p>
                <p><strong>Origin:</strong> {match.origin}</p>
                <p><strong>Match Percentage:</strong> {match.percentage}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No matches above 30% found.</p>
        )}
      </div>
    </div>
  );
};

export default ResultPage;

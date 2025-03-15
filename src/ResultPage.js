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

  return (
    <div className="container result-page">
      <div className="card">
        <h2>Matched Profiles</h2>
        {results ? (
          <ul>
            {results.matches.map((match, index) => (
              <li key={index}>
                <strong>{match.match}:</strong> {match.percentage}%
              </li>
            ))}
          </ul>
        ) : (
          <p>Loading results...</p>
        )}
      </div>
    </div>
  );
};

export default ResultPage;

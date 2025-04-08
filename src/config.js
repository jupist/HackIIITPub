// API base URL configuration
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://hackiiitpub.onrender.com' // Production URL
  : 'http://localhost:5000';

export default API_URL;
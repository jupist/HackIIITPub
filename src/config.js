// API base URL configuration
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-render-app-url.onrender.com' // Replace with your actual Render URL
  : 'http://localhost:5000';

export default API_URL;
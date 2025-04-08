import API_URL from './config';

// Use this function for API calls:
const callApi = async (endpoint, method = 'GET', body = null) => {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies/sessions
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  return response.json();
};

export default callApi;
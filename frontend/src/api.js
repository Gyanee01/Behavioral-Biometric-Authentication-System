import axios from 'axios';

// Create a new instance of axios
const api = axios.create({
  baseURL: 'http://localhost:5001/api', // The base URL for all our API calls
  withCredentials: true // This is the crucial part! It tells axios to send cookies with every request.
});

export default api;


import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://lakomika-calendar-backend-api.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL
})

export default api
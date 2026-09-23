import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  if (error.response?.status === 401 && !original?._retry && !original?.url?.includes('/auth/')) {
    original._retry = true
    try {
      await api.post('/auth/refresh')
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  }
  return Promise.reject(error)
})

export default api

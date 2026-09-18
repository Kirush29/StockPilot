import apiClient from './axiosClient'

export const authApi = {
  login: (email, password) => apiClient.post('/api/auth/login', { email, password }),
}

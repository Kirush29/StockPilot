import apiClient from './axiosClient'

export const authApi = {
  login: (username, password) => apiClient.post('/api/auth/login', { username, password }),
}

import apiClient from './axiosClient'

export const authApi = {
  login: (emailOrUsername, password) => apiClient.post('/api/auth/login', { emailOrUsername, password }),
}

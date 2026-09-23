import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set your backend URL (e.g., http://10.0.2.2:5004 for Android emulator, or your local IP for physical device)
// We'll use a placeholder that works for Android emulator by default if run locally,
// but it's best to configure via environment variables in production.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5004';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

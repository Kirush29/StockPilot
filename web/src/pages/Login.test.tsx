import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import Login from './Login';
import { apiClient } from '../services/apiClient';

import { vi } from 'vitest';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    data: any;
    constructor(message: string, status: number, data?: any) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  test('renders login form', () => {
    renderLogin();
    expect(screen.getByLabelText(/Email or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });



  test('calls API on submit', async () => {
    (apiClient.post as any).mockResolvedValue({ accessToken: 'fake-token', user: { role: 'BusinessOwner' } });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        emailOrUsername: 'testuser',
        password: 'password123'
      });
    });
  });
});

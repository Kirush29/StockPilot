import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import Users from './Users';
import { apiClient } from '../services/apiClient';
import { vi } from 'vitest';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  }
}));

describe('Users Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderUsers = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Users />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  test('fetches and renders users and branches', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/users')) {
        return Promise.resolve([
          { userId: '1', username: 'john', fullName: 'John Doe', role: 'StoreEmployee', email: 'john@example.com', isActive: true }
        ]);
      }
      if (url.includes('/branches')) {
        return Promise.resolve([
          { branchId: 'b1', name: 'Main Branch', branchCode: 'B001' }
        ]);
      }
      return Promise.resolve([]);
    });

    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@john')).toBeInTheDocument();
    });
  });
});

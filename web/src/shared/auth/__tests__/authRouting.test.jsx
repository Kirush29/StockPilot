import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../AuthContext'
import ProtectedRoute from '../ProtectedRoute'
import LoginPage from '../pages/LoginPage'

describe('Auth Route Guard & Login Routing', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('redirects unauthenticated users to /login when accessing protected routes', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/inventory']}>
          <Routes>
            <Route path="/login" element={<div>Login Page Display</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/inventory" element={<div>Inventory Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText('Login Page Display')).toBeInTheDocument()
    expect(screen.queryByText('Inventory Dashboard')).toBeNull()
  })

  it('renders protected routes when a valid token is present in session', () => {
    sessionStorage.setItem('stockpilot_token', 'valid-session-token')
    sessionStorage.setItem('stockpilot_user', JSON.stringify({ userId: 'u-1', role: 'BusinessOwner', fullName: 'Alice Owner' }))

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/inventory']}>
          <Routes>
            <Route path="/login" element={<div>Login Page Display</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/inventory" element={<div>Inventory Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText('Inventory Dashboard Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page Display')).toBeNull()
  })

  it('redirects to /inventory when role is insufficient', () => {
    sessionStorage.setItem('stockpilot_token', 'valid-token')
    sessionStorage.setItem('stockpilot_user', JSON.stringify({ userId: 'u-2', role: 'StoreEmployee' }))

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/procurement/budgets']}>
          <Routes>
            <Route path="/inventory" element={<div>Inventory Home</div>} />
            <Route element={<ProtectedRoute roles={['BusinessOwner', 'ProcurementManager']} redirectTo="/inventory" />}>
              <Route path="/procurement/budgets" element={<div>Budget Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText('Inventory Home')).toBeInTheDocument()
    expect(screen.queryByText('Budget Dashboard Content')).toBeNull()
  })

  it('renders the Login page properly for the user to sign in', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText('Welcome to StockPilot')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your username or email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })
})

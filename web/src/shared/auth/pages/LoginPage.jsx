import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authApi } from '../../../api/authApi'
import { useAuth } from '../AuthContext'
import ErrorState from '../../../components/ui/ErrorState'
import { FormInput } from '../../../components/ui/FormControls'
import { BoxIcon } from '../../../components/ui/Icons'

export default function LoginPage() {
  const { login, logout, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(localStorage.getItem('stockpilot_saved_username') || '')
  const [password, setPassword] = useState('')
  const [rememberUsername, setRememberUsername] = useState(!!localStorage.getItem('stockpilot_saved_username'))
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const trimmedUser = username.trim()
      if (!trimmedUser) {
        setError('Please enter your username or email address.')
        setLoading(false)
        return
      }

      if (trimmedUser.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUser)) {
        setError('Please enter a valid email address (e.g. user@stockpilot.local).')
        setLoading(false)
        return
      }

      if (!trimmedUser.includes('@') && trimmedUser.length < 3) {
        setError('Username must be at least 3 characters long.')
        setLoading(false)
        return
      }

      if (!password) {
        setError('Please enter your password.')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }

      if (rememberUsername) {
        localStorage.setItem('stockpilot_saved_username', trimmedUser)
      } else {
        localStorage.removeItem('stockpilot_saved_username')
      }

      const response = await authApi.login(trimmedUser, password)
      const { accessToken, user } = response.data
      login(accessToken, user, rememberUsername)
      navigate('/inventory', { replace: true })
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Backend is unavailable. Please make sure the server is running.')
      } else if (err.response?.status === 401) {
        setError('Invalid username/email or password. Please check your credentials.')
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)' }}>
      <div style={{ background: 'var(--color-bg)', padding: '40px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <BoxIcon style={{ width: 48, height: 48, color: 'var(--color-primary)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--color-text)' }}>Welcome to StockPilot</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Sign in to access your inventory</p>
        </div>

        {isAuthenticated() && (
          <div style={{
            background: 'var(--color-bg-secondary, #F8FAFC)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--color-text)'
          }}>
            <div style={{ marginBottom: '8px' }}>
              Currently signed in as <strong>{user?.fullName || user?.username || 'Authenticated User'}</strong> ({user?.role || 'Staff'}).
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/inventory', { replace: true })}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Go to Dashboard &rarr;
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={logout}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '24px' }}>
            <ErrorState error={error} inline />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Enter your username or email"
            required
          />
          <FormInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Enter your password"
            required
            suffix={
              <span
                style={{ cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </span>
            }
          />

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="rememberUsername"
              checked={rememberUsername}
              onChange={(e) => setRememberUsername(e.target.checked)}
              disabled={loading}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="rememberUsername" style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)' }}>
              Remember Username <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>(Optional)</span>
            </label>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

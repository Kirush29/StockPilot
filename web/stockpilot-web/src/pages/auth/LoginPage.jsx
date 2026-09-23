import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { useAuth } from '../../context/AuthContext'
import ErrorState from '../../components/ui/ErrorState'
import { FormInput } from '../../components/ui/FormControls'
import { BoxIcon } from '../../components/ui/Icons'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(localStorage.getItem('stockpilot_saved_username') || 'business@stockpilot.local')
  const [password, setPassword] = useState('DevPassword123!')
  const [rememberUsername, setRememberUsername] = useState(!!localStorage.getItem('stockpilot_saved_username'))
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (isAuthenticated()) {
    return <Navigate to="/inventory" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!username.trim() || !password.trim()) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }

      if (rememberUsername) {
        localStorage.setItem('stockpilot_saved_username', username)
      } else {
        localStorage.removeItem('stockpilot_saved_username')
      }

      const response = await authApi.login(username, password)
      const { accessToken, user } = response.data
      login(accessToken, user)
      navigate('/inventory', { replace: true })
    } catch (err) {
      if (err.message === 'Network Error') {
        setError('Backend is unavailable. Please make sure the server is running.')
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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <BoxIcon style={{ width: 48, height: 48, color: 'var(--color-primary)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--color-text)' }}>Welcome to StockPilot</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Sign in to access your inventory</p>
        </div>

        {error && (
          <div style={{ marginBottom: '24px' }}>
            <ErrorState error={error} inline />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
          <FormInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../../api/authApi'
import { useAuth } from '../AuthContext'
import ErrorState from '../../../components/ui/ErrorState'
import { FormInput } from '../../../components/ui/FormControls'
import './login.css'

const DEMO_PERSONAS = [
  { label: 'Business Owner', username: 'owner@stockpilot.local', password: 'DevPassword123!', icon: '👑' },
  { label: 'Procurement Mgr', username: 'procurement@stockpilot.local', password: 'DevPassword123!', icon: '📦' },
  { label: 'Branch Manager', username: 'branch@stockpilot.local', password: 'DevPassword123!', icon: '🏬' },
  { label: 'Store Employee', username: 'employee@stockpilot.local', password: 'DevPassword123!', icon: '👷' },
]

export default function LoginPage() {
  const { login, logout, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(localStorage.getItem('stockpilot_saved_username') || '')
  const [password, setPassword] = useState('')
  const [rememberUsername, setRememberUsername] = useState(!!localStorage.getItem('stockpilot_saved_username'))
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSelectPersona = (persona) => {
    setUsername(persona.username)
    setPassword(persona.password)
    setError(null)
  }

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
    <div className="login-viewport">
      <div className="login-grid">
        {/* Left: Futuristic Hero Showcase */}
        <aside className="login-hero-side">
          <div className="hero-brand-row">
            <img src="/stockpilot_logo.jpg" alt="StockPilot Logo" className="hero-logo-img" />
            <div>
              <span className="hero-brand-name">StockPilot</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                <span className="hero-badge-tag">AI-Powered</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Enterprise v2.4</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-center">
            <div className="hero-image-wrapper">
              <img src="/login_hero.jpg" alt="Autonomous Inventory Control" className="hero-main-img" />

              <div className="hero-float-card hero-float-top">
                <div className="float-badge-icon green">📈</div>
                <div>
                  <div className="float-badge-title">99.4% Stock Accuracy</div>
                  <div className="float-badge-sub">Live Telemetry & Sync</div>
                </div>
              </div>

              <div className="hero-float-card hero-float-bottom">
                <div className="float-badge-icon purple">🤖</div>
                <div>
                  <div className="float-badge-title">Gemini AI Replenishment</div>
                  <div className="float-badge-sub">Autonomous Decision Engine</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-footer-copy">
            <h2 className="hero-headline">
              Intelligent Logistics. <br />
              <span className="hero-gradient-text">Zero Stockouts, Maximum Efficiency.</span>
            </h2>
            <p className="hero-desc">
              Orchestrate multi-branch inventory, supplier evaluations, automated purchase orders, and real-time sales forecasting across your entire enterprise.
            </p>
          </div>
        </aside>

        {/* Right: Modern Sign-In Portal */}
        <main className="login-form-side">
          <div className="login-form-card">
            <div className="login-form-header">
              <h1 className="login-form-title">Welcome to StockPilot</h1>
              <p className="login-form-subtitle">Sign in to access your operations dashboard</p>
            </div>

            {isAuthenticated() && (
              <div style={{
                background: 'var(--color-bg-secondary, #F8FAFC)',
                border: '1px solid var(--color-border, #E2E8F0)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--color-text)'
              }}>
                <div style={{ marginBottom: '10px' }}>
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

            {/* Quick Demo Persona Pills */}
            <div className="demo-personas-container">
              <div className="demo-personas-label">
                <span>⚡ Quick Test Personas</span>
                <span className="hint">Click to auto-fill</span>
              </div>
              <div className="demo-pills-row">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.label}
                    type="button"
                    className="demo-pill-btn"
                    onClick={() => handleSelectPersona(persona)}
                    title={`Click to fill ${persona.label} credentials`}
                  >
                    <span className="pill-icon">{persona.icon}</span>
                    <span>{persona.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: '20px' }}>
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
                    style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                }
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  <input
                    type="checkbox"
                    id="rememberUsername"
                    checked={rememberUsername}
                    onChange={(e) => setRememberUsername(e.target.checked)}
                    disabled={loading}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  Remember Username
                </label>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span aria-hidden="true">&rarr;</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

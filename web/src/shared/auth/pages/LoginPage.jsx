import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Check } from 'lucide-react'
import { authApi } from '../../../api/authApi'
import { useAuth } from '../AuthContext'
import ErrorState from '../../../components/ui/ErrorState'
import { FormInput } from '../../../components/ui/FormControls'
import './login.css'

const DEMO_PERSONAS = [
  { label: 'Business Owner', username: 'business@stockpilot.local', password: 'DevPassword123!', icon: '👑' },
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
            <div className="hero-brand-info">
              <span className="hero-brand-name">StockPilot</span>
              <div className="hero-meta-row">
                <span className="hero-badge-tag">AI-Powered</span>
                <span className="hero-version-tag">Enterprise v2.4</span>
              </div>
            </div>
          </div>

          <div className="hero-visual-center">
            <div className="hero-image-wrapper">
              <img src="/login_hero.jpg" alt="Autonomous Inventory Control" className="hero-main-img" />

              <div className="hero-float-card hero-float-top">
                <div className="float-badge-icon green">
                  <span className="live-pulse-dot" />
                  📈
                </div>
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

        {/* Right: Modern SaaS Sign-In Portal */}
        <main className="login-form-side">
          <div className="login-form-card">
            <div className="login-form-header">
              <h1 className="login-form-title">Welcome to StockPilot</h1>
              <p className="login-form-subtitle">Sign in to access your operations dashboard</p>
            </div>

            {isAuthenticated() && (
              <div className="login-authenticated-card">
                <div className="authenticated-info">
                  Currently signed in as <strong>{user?.fullName || user?.username || 'Authenticated User'}</strong>{' '}
                  <span className="role-tag">({user?.role || 'Staff'})</span>
                </div>
                <div className="authenticated-actions">
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

            {/* Quick Demo Persona Chips */}
            <div className="demo-personas-container">
              <div className="demo-personas-header">
                <div className="demo-header-title">
                  <Zap size={13} className="demo-bolt-icon" aria-hidden="true" />
                  <span>Quick Test Personas</span>
                </div>
                <span className="demo-hint-text">Click to auto-fill</span>
              </div>
              <div className="demo-pills-grid">
                {DEMO_PERSONAS.map((persona) => {
                  const isSelected = username === persona.username
                  return (
                    <button
                      key={persona.label}
                      type="button"
                      className={`demo-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectPersona(persona)}
                      title={`Click to fill ${persona.label} credentials`}
                    >
                      <span className="pill-icon">{persona.icon}</span>
                      <span className="pill-name">{persona.label}</span>
                      {isSelected && <Check size={13} className="pill-check-icon" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="login-error-wrapper">
                <ErrorState error={error} inline />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <FormInput
                label="Username or Email"
                id="login-username"
                className="login-input-group"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="Enter your username or email"
                required
                prefix={<Mail size={18} className="login-input-icon" aria-hidden="true" />}
              />
              <FormInput
                label="Password"
                id="login-password"
                className="login-input-group login-input-with-suffix"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                required
                prefix={<Lock size={18} className="login-input-icon" aria-hidden="true" />}
                suffix={
                  <button
                    type="button"
                    className="login-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                }
              />

              <div className="login-remember-row">
                <label htmlFor="rememberUsername" className="login-remember-label">
                  <input
                    type="checkbox"
                    id="rememberUsername"
                    checked={rememberUsername}
                    onChange={(e) => setRememberUsername(e.target.checked)}
                    disabled={loading}
                    className="login-checkbox"
                  />
                  <span>Remember Username</span>
                </label>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} className="btn-arrow-icon" aria-hidden="true" />
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


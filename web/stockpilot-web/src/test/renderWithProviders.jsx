import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ProcurementProvider } from '../context/ProcurementContext'

/** Renders the current path so tests can assert on navigation. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

/**
 * Renders a page inside the real AuthProvider/ProcurementProvider, signed in with the given role
 * (null = signed out), at `route` matched against `path`.
 */
export function renderWithProviders(ui, { role = 'ProcurementManager', path = '/', route = '/' } = {}) {
  if (role) {
    localStorage.setItem('stockpilot_token', 'test-token')
    localStorage.setItem('stockpilot_user', JSON.stringify({ userId: 'u-1', role, fullName: `Test ${role}` }))
  }

  const user = userEvent.setup()
  const utils = render(
    <AuthProvider>
      <ProcurementProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={null} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ProcurementProvider>
    </AuthProvider>
  )
  return { user, ...utils }
}

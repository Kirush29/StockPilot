// Modules merged from web/src into the shell: they run inside the shell's providers, reach the API through the
// shell's axios client (base URL + the signed-in user's JWT), and hand off to shell pages.
import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../../shared/auth/AuthContext'
import { ProcurementProvider } from '../procurement/ProcurementContext'
import { API, server } from '../../test/server'
import ReorderAlertsPage from '../sales-demand/pages/ReorderAlertsPage'
import SuppliersPage from '../suppliers/pages/Suppliers'
import UsersPage from '../inventory/users/pages/Users'
import ReplenishmentPage from '../procurement/ReplenishmentPage'

const BRANCH = '11111111-1111-1111-1111-111111111111'
const PRODUCT = '18464716-8fa7-49da-b521-08b1dc057c28'

beforeAll(() => {
  // recharts' ResponsiveContainer needs ResizeObserver, which jsdom doesn't provide.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

function Location() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderIn(routes: Record<string, React.ReactNode>, route: string, role = 'BranchManager') {
  localStorage.setItem('stockpilot_token', 'shell-token')
  localStorage.setItem('stockpilot_user', JSON.stringify({ userId: 'u-1', role, fullName: `Test ${role}` }))
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <ProcurementProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            {Object.entries(routes).map(([path, element]) => <Route key={path} path={path} element={element} />)}
            <Route path="*" element={null} />
          </Routes>
          <Location />
        </MemoryRouter>
      </ProcurementProvider>
    </AuthProvider>
  )
  return user
}

describe('Sales & Demand pages in the shell', () => {
  const suggestion = {
    productId: PRODUCT, productSku: 'SKU-PARACETAMOL-500', productName: 'Paracetamol 500mg (100 Tabs)',
    branchId: BRANCH, branchName: 'Colombo Central Branch', currentStock: 40, averageDailySales: 18, leadTimeDays: 7,
    safetyStock: 30, reorderPoint: 156, recommendedOrderQuantity: 293, needsReorder: true, daysOfSupplyRemaining: 2,
    urgencyLevel: 'Critical',
  }

  function serveSales(seenAuth: string[]) {
    const track = (request: Request) => seenAuth.push(request.headers.get('Authorization') ?? '')
    server.use(
      http.get(`${API}/api/v1/Sales`, ({ request }) => { track(request); return HttpResponse.json([]) }),
      http.get(`${API}/api/v1/Sales/analytics`, ({ request }) => {
        track(request)
        return HttpResponse.json({ totalRevenue: 0, totalTransactions: 0, totalUnitsSold: 0, averageOrderValue: 0, topSellingProducts: [], slowMovingProducts: [], dailyTrends: [], categoryShares: [], branchComparisons: [], dayOfWeekPatterns: [] })
      }),
      http.get(`${API}/api/v1/demand/reorder-suggestions`, ({ request }) => { track(request); return HttpResponse.json([suggestion]) }),
      http.get(`${API}/api/v1/demand/history`, ({ request }) => {
        track(request)
        return HttpResponse.json([{ id: 'f-1', productId: PRODUCT, branchId: BRANCH, period: 30, confidenceScore: 0.9, predictedTotalDemand: 540, averageDailyDemand: 18, recommendedSafetyStock: 30, recommendedReorderQuantity: 293, trend: 'Stable', items: [] }])
      }),
      http.get(`${API}/api/v1/agent/audits`, ({ request }) => { track(request); return HttpResponse.json([]) }),
    )
  }

  it('loads through the shell client (/api/v1, JWT) and hands a reorder to the Replenishment orchestrator', async () => {
    const seenAuth: string[] = []
    serveSales(seenAuth)
    server.use(
      http.get(`${API}/api/branches`, () => HttpResponse.json({ success: true, data: [{ branchId: BRANCH, name: 'Colombo Central Branch' }] })),
      http.get(`${API}/api/products`, () => HttpResponse.json({ success: true, data: [{ productId: PRODUCT, name: 'Paracetamol 500mg (100 Tabs)', sku: 'SKU-PARACETAMOL-500' }] })),
    )
    const user = renderIn({ '/sales/reorder': <ReorderAlertsPage />, '/procurement/replenishment': <ReplenishmentPage /> }, '/sales/reorder')

    await user.click(await screen.findByRole('button', { name: /Draft Proposal/ }))
    await user.click(screen.getByRole('button', { name: /Dispatch to Procurement Agent/ }))

    expect(screen.getByTestId('location')).toHaveTextContent(`/procurement/replenishment?branchId=${BRANCH}&productId=${PRODUCT}`)
    // The orchestrator form arrives prefilled with the suggestion's branch and product.
    expect(await screen.findByLabelText(/Branch/)).toHaveValue(BRANCH)
    expect(await screen.findByRole('option', { name: /Paracetamol 500mg/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Product/)).toHaveValue(PRODUCT)

    // Verify the Sales & Demand API requests use the shell JWT. Do not assert an arbitrary
    // request count: page-level routes intentionally load only the data they need.
    expect(seenAuth.length).toBeGreaterThanOrEqual(2)
    expect(new Set(seenAuth)).toEqual(new Set(['Bearer shell-token']))
  })
})

describe('Supplier Management in the shell', () => {
  it('lists suppliers through the shell client with the signed-in JWT', async () => {
    let auth: string | null = null
    server.use(
      http.get(`${API}/api/Suppliers`, ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json([{ id: 's-1', supplierCode: 'SUP-ACME', name: 'Acme Office Supplies Pvt Ltd', contactEmail: 'acme@example.com', contactPhone: '+94', address: 'Colombo', rating: 4.2, isActive: true, isBlocked: false, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }])
      }),
    )
    renderIn({ '/suppliers': <SuppliersPage /> }, '/suppliers', 'StoreEmployee')

    expect(await screen.findByText('Acme Office Supplies Pvt Ltd')).toBeInTheDocument()
    expect(auth).toBe('Bearer shell-token')
  })
})

describe('Users administration in the shell', () => {
  it('fetches and renders users and branches (ported from web/src Users.test.tsx)', async () => {
    server.use(
      http.get(`${API}/api/users`, () => HttpResponse.json([
        { userId: '1', username: 'john', fullName: 'John Doe', role: 'StoreEmployee', email: 'john@example.com', isActive: true },
      ])),
      http.get(`${API}/api/branches`, () => HttpResponse.json([{ branchId: 'b1', name: 'Main Branch', branchCode: 'B001' }])),
    )
    renderIn({ '/users': <UsersPage /> }, '/users', 'BusinessOwner')

    const row = (await screen.findByText('John Doe')).closest('tr') ?? document.body
    expect(within(row as HTMLElement).getByText('@john')).toBeInTheDocument()
  })

  it('handles ApiResponse branch envelope and opens Add User modal without crashing', async () => {
    const BRANCH_ID = '22222222-2222-2222-2222-222222222222'
    server.use(
      http.get(`${API}/api/users`, () => HttpResponse.json([])),
      http.get(`${API}/api/branches`, () => HttpResponse.json({
        success: true,
        data: [{ branchId: BRANCH_ID, name: 'Kandy Hub', branchCode: 'KDY-01' }],
      })),
    )
    const user = renderIn({ '/users': <UsersPage /> }, '/users', 'BusinessOwner')

    // Click Add User button
    await user.click(await screen.findByRole('button', { name: /Add User/i }))

    // Modal title should appear
    expect(await screen.findByText('Add New User')).toBeInTheDocument()
    // Branch option from envelope should be present
    expect(await screen.findByRole('option', { name: /Kandy Hub/i })).toBeInTheDocument()
  })
})

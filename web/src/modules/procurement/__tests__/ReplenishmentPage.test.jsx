import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import ReplenishmentPage from '../ReplenishmentPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { API, server } from '../../../test/server'

const BRANCH = '11111111-1111-1111-1111-111111111111'
const PRODUCT = '18464716-8fa7-49da-b521-08b1dc057c28'
const RUN = 'aaaaaaaa-0000-4000-8000-000000000001'
const PROC_WF = 'bbbbbbbb-0000-4000-8000-000000000001'
const PROPOSAL = 'cccccccc-0000-4000-8000-000000000001'

function detail(liveProposalStatus = 'PendingApproval', status = 'PendingApproval') {
  return {
    workflowId: RUN,
    objective: 'Replenishment check for SKU-PARACETAMOL-500 at Colombo',
    initiatedBy: 'u-1',
    currentStep: 'AwaitHumanApproval',
    approvalStatus: 'PendingHumanApproval',
    startedAtUtc: '2026-09-27T10:00:00Z',
    executionDurationMs: 2164,
    liveProposalStatus,
    result: {
      workflowId: RUN,
      status,
      decision: 'Reorder',
      orderQuantity: 293,
      forecastReorderQuantity: 293,
      inventoryShortageQuantity: 110,
      selectedQuotationId: 'c0000000-0000-0000-0000-000000000002',
      proposalId: PROPOSAL,
      humanApprovalRequired: true,
      nextAction: `Approve or reject proposal ${PROPOSAL}.`,
      childWorkflows: { procurementWorkflowId: PROC_WF },
      errors: [],
    },
    steps: [
      { stepIndex: 0, action: 'Plan: validate the objective', status: 'Completed' },
      { stepIndex: 1, action: 'Delegate to Inventory Optimization Agent', status: 'Completed', detail: 'Reorder recommended (LowStock).' },
      { stepIndex: 2, action: 'Delegate to Demand Forecast Agent', status: 'Completed' },
      { stepIndex: 3, action: 'Delegate to Supplier Evaluation Agent', status: 'Completed' },
      { stepIndex: 4, action: 'Delegate to Procurement Coordinator Agent', status: 'Completed' },
      { stepIndex: 5, action: 'Stop for human approval', status: 'Completed' },
    ],
    toolExecutions: [],
    validationResults: [
      { rule: 'ForecastMatchesContract', passed: true, details: 'ok' },
      { rule: 'SupplierSelectionMatchesContract', passed: true, details: 'ok' },
    ],
    errors: [],
  }
}

function serveCatalog() {
  server.use(
    http.get(`${API}/api/branches`, () => HttpResponse.json({ success: true, data: [{ branchId: BRANCH, name: 'Colombo Central Branch', isActive: true }] })),
    http.get(`${API}/api/products`, () => HttpResponse.json({ success: true, data: [{ productId: PRODUCT, name: 'Paracetamol 500mg', sku: 'SKU-PARACETAMOL-500' }] }))
  )
}

describe('ReplenishmentPage — start a run', () => {
  it('sends the chosen branch and product to the orchestrator and opens the run', async () => {
    serveCatalog()
    let body
    server.use(
      http.post(`${API}/api/agent-workflows/replenishment/start`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ workflowId: RUN, status: 'PendingApproval' }, { status: 201 })
      })
    )
    const { user } = renderWithProviders(<ReplenishmentPage />, { role: 'BranchManager', path: '/procurement/replenishment', route: '/procurement/replenishment' })

    await screen.findByRole('option', { name: 'Colombo Central Branch' })
    await screen.findByRole('option', { name: 'Paracetamol 500mg (SKU-PARACETAMOL-500)' })
    await user.selectOptions(screen.getByLabelText(/Branch/), BRANCH)
    await user.selectOptions(screen.getByLabelText(/Product/), PRODUCT)
    await user.click(screen.getByRole('button', { name: 'Run replenishment check' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(`/procurement/replenishment/${RUN}`)
    expect(body).toEqual({ branchId: BRANCH, productId: PRODUCT })
  })

  it('opens the run even when the orchestrator answers 422 with a result', async () => {
    serveCatalog()
    server.use(
      http.post(`${API}/api/agent-workflows/replenishment/start`, () =>
        HttpResponse.json({ workflowId: RUN, status: 'ChecksFailed', errors: ['Budget exceeded.'] }, { status: 422 }))
    )
    const { user } = renderWithProviders(<ReplenishmentPage />, { role: 'ProcurementManager', path: '/procurement/replenishment', route: '/procurement/replenishment' })

    await screen.findByRole('option', { name: 'Colombo Central Branch' })
    await user.selectOptions(screen.getByLabelText(/Branch/), BRANCH)
    await screen.findByRole('option', { name: 'Paracetamol 500mg (SKU-PARACETAMOL-500)' })
    await user.selectOptions(screen.getByLabelText(/Product/), PRODUCT)
    await user.click(screen.getByRole('button', { name: 'Run replenishment check' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(`/procurement/replenishment/${RUN}`)
  })

  it('asks for a branch and product before calling the API', async () => {
    serveCatalog()
    const { user } = renderWithProviders(<ReplenishmentPage />, { role: 'BranchManager', path: '/procurement/replenishment', route: '/procurement/replenishment' })

    await user.click(await screen.findByRole('button', { name: 'Run replenishment check' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a branch and a product.')
  })
})

describe('ReplenishmentPage — a run', () => {
  const renderRun = (role) =>
    renderWithProviders(<ReplenishmentPage />, { role, path: '/procurement/replenishment/:workflowId', route: `/procurement/replenishment/${RUN}` })

  it('shows the outcome, every agent step and the contract checks', async () => {
    server.use(http.get(`${API}/api/agent-workflows/replenishment/${RUN}`, () => HttpResponse.json(detail())))
    renderRun('BranchManager')

    const result = await screen.findByTestId('replenishment-result')
    expect(within(result).getByText('Proposal awaiting approval')).toBeInTheDocument()
    expect(within(result).getAllByText('293')).toHaveLength(2)
    expect(within(screen.getByRole('list', { name: 'Agent steps' })).getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Reorder recommended (LowStock).')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Contract checks' })).getByText('ForecastMatchesContract')).toBeInTheDocument()
    // Branch managers can't approve.
    expect(screen.queryByRole('button', { name: 'Approve proposal' })).not.toBeInTheDocument()
  })

  it('lets a Procurement Manager approve through the agent workflow and shows the live status', async () => {
    let current = detail()
    const approvals = []
    server.use(
      http.get(`${API}/api/agent-workflows/replenishment/${RUN}`, () => HttpResponse.json(current)),
      http.post(`${API}/api/agent-workflows/${PROC_WF}/approve`, async ({ request }) => {
        approvals.push(await request.json())
        current = detail('Approved')
        return HttpResponse.json({ status: 'Approved' })
      })
    )
    const { user } = renderRun('ProcurementManager')

    await user.click(await screen.findByRole('button', { name: 'Approve proposal' }))

    expect(await screen.findByText('Approved')).toBeInTheDocument()
    expect(approvals).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Approve proposal' })).not.toBeInTheDocument()
  })

  it('reports a missing run', async () => {
    server.use(http.get(`${API}/api/agent-workflows/replenishment/${RUN}`, () => new HttpResponse(null, { status: 404 })))
    renderRun('ProcurementManager')

    expect(await screen.findByText('This replenishment run no longer exists.')).toBeInTheDocument()
  })
})

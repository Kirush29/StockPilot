// Cross-platform end-to-end run, web side. Runs only via `npm run test:e2e`, driven by
// scripts/e2e/run-replenishment-e2e.sh against a live API and PostgreSQL (no MSW):
//
//   E2E_STAGE=initiate  A Procurement Manager uses the real Replenishment page to run the multi-agent
//                       orchestrator for Paracetamol at Colombo: Inventory Optimization -> Demand Forecast
//                       -> Supplier Evaluation -> Procurement Coordinator, stopping at PendingApproval.
//                       The other two routes (transfer, no action) are checked on real data too.
//   E2E_STAGE=approve   A Business Owner approves on the same page (human gate); the proposal is converted
//                       to a purchase order and received, which creates an Inventory batch (D14).
//
// The Flutter "verify" stage then checks the final status from mobile. State is handed between stages
// through the JSON file at E2E_STATE_FILE.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../src/shared/auth/AuthContext'
import { ProcurementProvider } from '../src/modules/procurement/ProcurementContext'
import ReplenishmentPage from '../src/modules/procurement/ReplenishmentPage'
import { authApi } from '../src/api/authApi'
import { agentWorkflowsApi, ordersApi, proposalsApi, replenishmentApi } from '../src/api/procurementApi'
import { batchesApi, inventoryApi } from '../src/api/inventoryApi'
import { PurchaseOrderStatus } from '../src/modules/procurement/procurementEnums'

const configured = Boolean(process.env.E2E_API_URL && process.env.E2E_STATE_FILE)
const stage = process.env.E2E_STAGE ?? 'initiate'
const readState = () => (existsSync(process.env.E2E_STATE_FILE) ? JSON.parse(readFileSync(process.env.E2E_STATE_FILE, 'utf8') || '{}') : {})
const writeState = (patch) => writeFileSync(process.env.E2E_STATE_FILE, JSON.stringify({ ...readState(), ...patch }, null, 2))

// Development demo data (PlatformDemoDataSeeder).
const COLOMBO = '11111111-1111-1111-1111-111111111111'
const PARACETAMOL = '18464716-8fa7-49da-b521-08b1dc057c28'
const VITAMIN_C = '38464716-8fa7-49da-b521-08b1dc057c30'
const AMOXICILLIN = '28464716-8fa7-49da-b521-08b1dc057c29'
const PARACETAMOL_QUOTATIONS = ['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002']
const AGENT_CALLS = [
  'InventoryOptimizationAgent.GenerateRecommendations',
  'DemandForecastAgent.ExecuteForecastWorkflow',
  'SupplierEvaluationAgent.EvaluateQuotations',
  'ProcurementCoordinatorAgent.Start',
]

async function signIn(email) {
  const res = await authApi.login(email, 'DevPassword123!')
  localStorage.setItem('stockpilot_token', res.data.accessToken)
  localStorage.setItem('stockpilot_user', JSON.stringify(res.data.user))
  return res.data.user
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

/** The real Replenishment page inside the app's real providers, as App.jsx routes it. */
function renderReplenishment(route) {
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <ProcurementProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/procurement/replenishment" element={<ReplenishmentPage />} />
            <Route path="/procurement/replenishment/:workflowId" element={<ReplenishmentPage />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ProcurementProvider>
    </AuthProvider>
  )
  return user
}

const stockAt = async (branchId, productId) =>
  Number((await inventoryApi.getByBranchAndProduct(branchId, productId)).data.data.quantityOnHand)

describe.skipIf(!configured || stage !== 'initiate')('React: Procurement Manager runs the multi-agent replenishment workflow', () => {
  it('the Replenishment page runs all four real agents and stops at PendingApproval', async () => {
    const pm = await signIn('procurement@stockpilot.local')
    expect(pm.role).toBe('ProcurementManager')
    const stockBefore = await stockAt(COLOMBO, PARACETAMOL)

    const user = renderReplenishment('/procurement/replenishment')
    await screen.findByRole('option', { name: 'Colombo Central Branch' })
    await screen.findByRole('option', { name: /Paracetamol 500mg/ })
    await user.selectOptions(screen.getByLabelText(/Branch/), COLOMBO)
    await user.selectOptions(screen.getByLabelText(/Product/), PARACETAMOL)
    await user.click(screen.getByRole('button', { name: 'Run replenishment check' }))

    const result = await screen.findByTestId('replenishment-result', {}, { timeout: 60000 })
    expect(within(result).getByText('Proposal awaiting approval')).toBeInTheDocument()
    const workflowId = screen.getByTestId('location').textContent.split('/').pop()

    // The trace the page shows, read through the same API module.
    const detail = (await replenishmentApi.get(workflowId)).data
    const r = detail.result
    expect(r.status).toBe('PendingApproval')
    expect(r.decision).toBe('Reorder')
    expect(r.orderQuantity).toBeGreaterThan(0)
    expect(r.orderQuantity).toBe(Math.ceil(r.forecastReorderQuantity)) // D12: the forecast sizes the order
    expect(PARACETAMOL_QUOTATIONS).toContain(r.selectedQuotationId) // D11: the Supplier agent's pick
    expect(detail.toolExecutions.map((t) => t.toolName)).toEqual(AGENT_CALLS)
    expect(detail.toolExecutions.every((t) => t.isSuccess)).toBe(true)
    expect(detail.validationResults.filter((v) => !v.passed)).toEqual([])
    expect(detail.liveProposalStatus).toBe('PendingApproval')
    expect(r.childWorkflows.inventoryRecommendationId).toBeTruthy()
    expect(r.childWorkflows.demandForecastWorkflowId).toBeTruthy()
    expect(r.childWorkflows.procurementWorkflowId).toBeTruthy()

    writeState({
      workflowId,
      procurementWorkflowId: r.childWorkflows.procurementWorkflowId,
      proposalId: r.proposalId,
      orderQuantity: r.orderQuantity,
      selectedQuotationId: r.selectedQuotationId,
      stockBefore,
    })
    console.log(`E2E initiate: run ${workflowId} -> proposal ${r.proposalId} for ${r.orderQuantity} units (quotation ${r.selectedQuotationId}), PendingApproval`)
  }, 90000)

  it('the same orchestrator routes a surplus elsewhere to a transfer and healthy stock to no action', async () => {
    await signIn('procurement@stockpilot.local')

    const transfer = (await replenishmentApi.start({ branchId: COLOMBO, productId: VITAMIN_C })).data
    const none = (await replenishmentApi.start({ branchId: COLOMBO, productId: AMOXICILLIN })).data

    expect(transfer.status).toBe('TransferRecommended')
    expect(transfer.childWorkflows.procurementWorkflowId).toBeNull()
    expect(none.status).toBe('NoActionRequired')
  }, 60000)

  it('a Branch Manager cannot approve the proposal', async () => {
    const { procurementWorkflowId } = readState()
    await signIn('branch@stockpilot.local')

    const error = await agentWorkflowsApi.approve(procurementWorkflowId, 'self-approval attempt').catch((e) => e)

    expect(error.response?.status).toBe(403)
  })
})

describe.skipIf(!configured || stage !== 'approve')('React: Business Owner approves; the order is placed and received', () => {
  it('the Business Owner approves on the Replenishment page', async () => {
    const { workflowId } = readState()
    const owner = await signIn('business@stockpilot.local')
    expect(owner.role).toBe('BusinessOwner')

    const user = renderReplenishment(`/procurement/replenishment/${workflowId}`)
    await user.click(await screen.findByRole('button', { name: 'Approve proposal' }, { timeout: 30000 }))

    // After approving, the page reloads the run and renders a new result card, so the card is looked up
    // again on each retry (a reference taken before the reload would be a detached node).
    await waitFor(() => {
      const card = screen.getByTestId('replenishment-result')
      expect(within(card).getByText('Approved')).toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: 'Approve proposal' })).not.toBeInTheDocument()
    }, { timeout: 30000 })
    console.log(`E2E approve: run ${workflowId} approved by the Business Owner in the web app`)
  }, 60000)

  it('the approved proposal becomes a purchase order, and receiving it creates an Inventory batch (D14)', async () => {
    const { proposalId, orderQuantity, stockBefore } = readState()
    await signIn('procurement@stockpilot.local')

    const order = (await proposalsApi.convert(proposalId)).data
    const received = (await ordersApi.updateStatus(order.id, { status: PurchaseOrderStatus.Received, notes: 'Received during E2E run' })).data
    expect(received.status).toBe(PurchaseOrderStatus.Received)

    expect(await stockAt(COLOMBO, PARACETAMOL)).toBe(stockBefore + orderQuantity)
    const batches = (await batchesApi.getAll()).data.data
    const batch = batches.find((b) => b.batchNumber === `${order.orderNumber}-L1`)
    expect(batch).toBeDefined()
    expect(Number(batch.quantity)).toBe(orderQuantity)

    writeState({ purchaseOrderId: order.id, orderNumber: order.orderNumber })
    console.log(`E2E receive: ${order.orderNumber} received, Colombo stock ${stockBefore} -> ${stockBefore + orderQuantity}, batch ${batch.batchNumber}`)
  }, 60000)
})

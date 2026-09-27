import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import AgentMonitoringPage from '../AgentMonitoringPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { API, server } from '../../../test/server'

const runs = [
  { workflowId: 'aaaaaaaa-0000-4000-8000-000000000003', agentName: 'ReplenishmentOrchestrator', status: 'PendingApproval', approvalStatus: 'PendingHumanApproval', createdAtUtc: '2026-09-28T10:03:00Z', executionDurationMs: 2100, objective: 'Replenishment check', initiatedBy: 'u-1', toolExecutions: [], validationResults: [] },
  { workflowId: 'aaaaaaaa-0000-4000-8000-000000000002', agentName: 'ProcurementCoordinatorAgent', status: 'PendingApproval', approvalStatus: 'PendingApproval', createdAtUtc: '2026-09-28T10:02:00Z', executionDurationMs: 600, objective: 'Reorder', initiatedBy: 'u-1', toolExecutions: [], validationResults: [] },
  { workflowId: 'aaaaaaaa-0000-4000-8000-000000000001', agentName: 'DemandForecastAgent', status: 'Completed', approvalStatus: 'NotRequired', createdAtUtc: '2026-09-28T10:01:00Z', executionDurationMs: 300, objective: 'Forecast', initiatedBy: 'u-1', toolExecutions: [], validationResults: [] },
]

describe('AgentMonitoringPage', () => {
  it('lists every agent’s runs from the shared audit endpoint', async () => {
    let requested
    server.use(
      http.get(`${API}/api/agent-workflows/audits`, ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json(runs)
      })
    )
    renderWithProviders(<AgentMonitoringPage />, { role: 'BusinessOwner' })

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Replenishment Orchestrator')).toBeInTheDocument()
    expect(within(table).getByText('Procurement Coordinator')).toBeInTheDocument()
    expect(within(table).getByText('Demand Forecast')).toBeInTheDocument()
    expect(requested.searchParams.get('take')).toBe('50')
  })
})

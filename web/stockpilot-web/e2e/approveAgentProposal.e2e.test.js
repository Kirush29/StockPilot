// Cross-client end-to-end run, web side (approval). Runs only via `npm run test:e2e`, driven by
// scripts/e2e/run-procurement-cross-client.sh after the Flutter "initiate" stage has written the
// workflow it created to E2E_STATE_FILE. Uses the app's real API modules against the live API.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { authApi } from '../src/api/authApi'
import { agentWorkflowsApi, proposalsApi } from '../src/api/procurementApi'
import { ProposalStatus } from '../src/utils/procurementEnums'

const configured = Boolean(process.env.E2E_API_URL && process.env.E2E_STATE_FILE)
const state = configured ? JSON.parse(readFileSync(process.env.E2E_STATE_FILE, 'utf8')) : {}

async function signIn(username) {
  const res = await authApi.login(username, 'DevPassword123!')
  localStorage.setItem('stockpilot_token', res.data.accessToken)
  localStorage.setItem('stockpilot_user', JSON.stringify(res.data.user))
  return res.data.user
}

describe.skipIf(!configured)('Procurement Manager approves the agent proposal raised from mobile', () => {
  it('the proposal is in the approval queue, flagged as agent-created and pending', async () => {
    const user = await signIn('procurement@stockpilot.local')
    expect(user.role).toBe('ProcurementManager')

    // Same query ApprovalQueuePage makes.
    const queue = await proposalsApi.list({ status: ProposalStatus.PendingApproval, pageSize: 100 })
    const item = queue.data.items.find((p) => p.id === state.proposalId)
    expect(item).toBeDefined()
    expect(item.createdByAgent).toBe(true)

    const trace = await agentWorkflowsApi.get(state.workflowId)
    expect(trace.data.toolExecutions.map((t) => t.toolName)).toEqual(['CheckBudget', 'ValidateBusinessRules', 'CreateProposal'])
    expect(trace.data.approvalStatus).toBe('PendingApproval')
  })

  it('a Branch Manager cannot approve it', async () => {
    await signIn('branch@stockpilot.local')

    const error = await agentWorkflowsApi.approve(state.workflowId, 'self-approval attempt').catch((e) => e)

    expect(error.response?.status).toBe(403)
  })

  it('the Procurement Manager approves it through the human gate', async () => {
    await signIn('procurement@stockpilot.local')

    const res = await agentWorkflowsApi.approve(state.workflowId, 'Approved in web app during E2E run')

    expect(res.status).toBe(200)
    expect(res.data.status).toBe(ProposalStatus.Approved)
    expect(res.data.approvalDecisions).toHaveLength(1)
    console.log(`E2E approve: proposal ${state.proposalId} approved by Procurement Manager in the web client`)
  })
})

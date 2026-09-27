import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import ProposalDetailPage from '../ProposalDetailPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { API, server } from '../../../test/server'
import { ProposalStatus, ApprovalDecisionType } from '../procurementEnums'

const ID = '77777777-7777-7777-7777-777777777772'
const BRANCH = '11111111-1111-1111-1111-111111111111'

function proposal(overrides = {}) {
  return {
    id: ID,
    branchId: BRANCH,
    supplierId: '22222222-2222-2222-2222-222222222222',
    quotationId: null,
    createdByUserId: 'u-9',
    createdByAgent: false,
    status: ProposalStatus.PendingApproval,
    totalEstimatedCost: 25000,
    justification: 'Paper is running low.',
    createdAt: '2026-09-20T09:00:00Z',
    updatedAt: '2026-09-20T09:00:00Z',
    lineItems: [{ id: 'li-1', productId: 'p-1', productName: 'Copy Paper A4', quantity: 50, unitPrice: 500, lineTotal: 25000 }],
    approvalDecisions: [],
    ...overrides,
  }
}

/** Serves the proposal and its branch budget; returns the list of decision/convert requests received. */
function serve(initial) {
  let current = initial
  const calls = []
  server.use(
    http.get(`${API}/api/procurement/proposals/${ID}`, () => HttpResponse.json(current)),
    http.get(`${API}/api/procurement/budgets`, () =>
      HttpResponse.json([{ id: 'b-1', branchId: BRANCH, periodStart: '2026-01-01', periodEnd: '2026-12-31', allocatedAmount: 500000, spentAmount: 6000 }])
    ),
    http.post(`${API}/api/procurement/proposals/${ID}/decision`, async ({ request }) => {
      const body = await request.json()
      calls.push({ type: 'decision', body, auth: request.headers.get('Authorization') })
      const status = { [ApprovalDecisionType.Approved]: ProposalStatus.Approved, [ApprovalDecisionType.Rejected]: ProposalStatus.Rejected }[body.decision]
      current = { ...current, status, approvalDecisions: [{ id: 'd-1', decidedByUserId: 'u-1', decision: body.decision, comment: body.comment, decidedAt: '2026-09-21T10:00:00Z' }] }
      return HttpResponse.json(current)
    }),
    http.post(`${API}/api/procurement/proposals/${ID}/convert`, () => {
      calls.push({ type: 'convert' })
      return HttpResponse.json({ id: 'po-1' }, { status: 201 })
    })
  )
  return calls
}

const renderPage = (role) =>
  renderWithProviders(<ProposalDetailPage />, { role, path: '/procurement/proposals/:id', route: `/procurement/proposals/${ID}` })

const decisionButtons = () => ['Approve', 'Reject', 'Request Revision'].map((name) => screen.queryByRole('button', { name }))

describe('ProposalDetailPage — role-gated decision actions', () => {
  it.each(['ProcurementManager', 'BusinessOwner'])('%s sees Approve / Reject / Request Revision on a pending proposal', async (role) => {
    serve(proposal())
    renderPage(role)

    await screen.findByText('Copy Paper A4')
    decisionButtons().forEach((button) => expect(button).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Convert to Purchase Order' })).not.toBeInTheDocument()
  })

  it.each(['BranchManager', 'StoreEmployee'])('%s sees no decision buttons', async (role) => {
    serve(proposal())
    renderPage(role)

    await screen.findByText('Copy Paper A4')
    decisionButtons().forEach((button) => expect(button).not.toBeInTheDocument())
  })

  it.each([ProposalStatus.Draft, ProposalStatus.Rejected, ProposalStatus.Converted])('managers get no decision buttons when status is %s', async (status) => {
    serve(proposal({ status }))
    renderPage('ProcurementManager')

    await screen.findByText('Copy Paper A4')
    decisionButtons().forEach((button) => expect(button).not.toBeInTheDocument())
  })

  it('offers Convert (not Approve) once the proposal is Approved, and only to managers', async () => {
    serve(proposal({ status: ProposalStatus.Approved }))
    const { unmount } = renderPage('ProcurementManager')

    expect(await screen.findByRole('button', { name: 'Convert to Purchase Order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    unmount()

    serve(proposal({ status: ProposalStatus.Approved }))
    renderPage('BranchManager')
    await screen.findByText('Copy Paper A4')
    expect(screen.queryByRole('button', { name: 'Convert to Purchase Order' })).not.toBeInTheDocument()
  })

  it('labels agent-created proposals', async () => {
    serve(proposal({ createdByAgent: true }))
    renderPage('ProcurementManager')

    expect(await screen.findByText('Procurement Coordinator Agent')).toBeInTheDocument()
  })
})

describe('ProposalDetailPage — decision flow', () => {
  it('approving posts the decision with the comment and shows the new status', async () => {
    const calls = serve(proposal())
    const { user } = renderPage('ProcurementManager')

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Approve Proposal')).toBeInTheDocument()
    await user.type(within(dialog).getByPlaceholderText('Add context for this decision…'), '  Looks good  ')
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls).toEqual([{ type: 'decision', body: { decision: ApprovalDecisionType.Approved, comment: 'Looks good' }, auth: 'Bearer test-token' }])
    expect(await screen.findByRole('button', { name: 'Convert to Purchase Order' })).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
  })

  it('rejecting sends decision 1 and removes the actions', async () => {
    const calls = serve(proposal())
    const { user } = renderPage('ProcurementManager')

    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByPlaceholderText('Add context for this decision…'), 'Too expensive')
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].body).toEqual({ decision: ApprovalDecisionType.Rejected, comment: 'Too expensive' })
    await waitFor(() => decisionButtons().forEach((button) => expect(button).not.toBeInTheDocument()))
  })

  it('shows the approval-limit message when the server answers 403, and keeps the proposal pending', async () => {
    serve(proposal({ totalEstimatedCost: 75000 }))
    server.use(
      http.post(`${API}/api/procurement/proposals/${ID}/decision`, () =>
        HttpResponse.json({ title: 'Approval limit exceeded' }, { status: 403 })
      )
    )
    const { user } = renderPage('ProcurementManager')

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }))

    expect(await within(screen.getByRole('dialog')).findByText(/exceeds your role's approval limit/)).toBeInTheDocument()
    expect(screen.getAllByText('Pending Approval').length).toBeGreaterThan(0)
  })

  it('shows the server detail on 409 (already decided elsewhere)', async () => {
    serve(proposal())
    server.use(
      http.post(`${API}/api/procurement/proposals/${ID}/decision`, () =>
        HttpResponse.json({ detail: 'Only proposals awaiting approval can be decided on (current status: Approved).' }, { status: 409 })
      )
    )
    const { user } = renderPage('BusinessOwner')

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }))

    expect(await within(screen.getByRole('dialog')).findByText(/current status: Approved/)).toBeInTheDocument()
  })

  it('converting posts to /convert and navigates to the purchase orders page', async () => {
    const calls = serve(proposal({ status: ProposalStatus.Approved }))
    const { user } = renderPage('ProcurementManager')

    await user.click(await screen.findByRole('button', { name: 'Convert to Purchase Order' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/procurement/orders'))
    expect(calls).toEqual([{ type: 'convert' }])
  })

  it('shows a not-found message for a deleted proposal', async () => {
    server.use(http.get(`${API}/api/procurement/proposals/${ID}`, () => HttpResponse.json({}, { status: 404 })))
    renderPage('ProcurementManager')

    expect(await screen.findByText('This proposal no longer exists.')).toBeInTheDocument()
  })
})

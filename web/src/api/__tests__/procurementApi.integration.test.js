import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { agentWorkflowsApi, budgetsApi, ordersApi, proposalsApi } from '../procurementApi'
import { API, server } from '../../test/server'

// Exercises the real axios client (base URL, auth interceptor, error normalisation) against
// mocked procurement endpoints, checking the exact requests the UI sends.

function record(method, path, respond) {
  const requests = []
  server.use(
    http[method](`${API}${path}`, async ({ request }) => {
      const url = new URL(request.url)
      const body = method === 'get' ? null : await request.text()
      requests.push({
        auth: request.headers.get('Authorization'),
        query: Object.fromEntries(url.searchParams),
        body: body ? JSON.parse(body) : null,
      })
      return respond()
    })
  )
  return requests
}

describe('procurement API client', () => {
  it('sends the stored JWT as a bearer token', async () => {
    localStorage.setItem('stockpilot_token', 'jwt-abc')
    const requests = record('get', '/api/procurement/proposals/p-1', () => HttpResponse.json({ id: 'p-1' }))

    const res = await proposalsApi.getById('p-1')

    expect(res.data.id).toBe('p-1')
    expect(requests[0].auth).toBe('Bearer jwt-abc')
  })

  it('sends no Authorization header when signed out', async () => {
    const requests = record('get', '/api/procurement/orders', () => HttpResponse.json({ items: [] }))

    await ordersApi.list()

    expect(requests[0].auth).toBeNull()
  })

  it('lists proposals with filter, paging and sort parameters', async () => {
    const requests = record('get', '/api/procurement/proposals', () => HttpResponse.json({ items: [], totalCount: 0 }))

    await proposalsApi.list({ status: 1, branchId: 'b-1', page: 2 })

    expect(requests[0].query).toEqual({ status: '1', branchId: 'b-1', page: '2', pageSize: '20', sort: '-createdAt' })
  })

  it('posts a decision to the decision endpoint', async () => {
    const requests = record('post', '/api/procurement/proposals/p-1/decision', () => HttpResponse.json({ id: 'p-1', status: 2 }))

    const res = await proposalsApi.decide('p-1', { decision: 0, comment: 'ok' })

    expect(requests[0].body).toEqual({ decision: 0, comment: 'ok' })
    expect(res.data.status).toBe(2)
  })

  it('converts an approved proposal and returns the created order', async () => {
    record('post', '/api/procurement/proposals/p-1/convert', () => HttpResponse.json({ id: 'po-1', orderNumber: 'PO-2026-000002' }, { status: 201 }))

    const res = await proposalsApi.convert('p-1')

    expect(res.status).toBe(201)
    expect(res.data.orderNumber).toBe('PO-2026-000002')
  })

  it('patches order status for delivery receiving', async () => {
    const requests = record('patch', '/api/procurement/orders/po-1/status', () => HttpResponse.json({ id: 'po-1', status: 2 }))

    await ordersApi.updateStatus('po-1', { status: 2, notes: 'all boxes' })

    expect(requests[0].body).toEqual({ status: 2, notes: 'all boxes' })
  })

  it('scopes budgets to a branch only when one is given', async () => {
    const requests = record('get', '/api/procurement/budgets', () => HttpResponse.json([]))

    await budgetsApi.list('b-1')
    await budgetsApi.list()

    expect(requests.map((r) => r.query)).toEqual([{ branchId: 'b-1' }, {}])
  })

  it('turns a 400 ProblemDetails into camelCase field errors', async () => {
    record('post', '/api/procurement/proposals', () =>
      HttpResponse.json(
        { title: 'Validation failed', status: 400, errors: { 'LineItems[0].Quantity': ['must be > 0'], SupplierId: ['required'] } },
        { status: 400 }
      )
    )

    const error = await proposalsApi.create({}).catch((e) => e)

    expect(error.response.status).toBe(400)
    expect(error.fieldErrors).toEqual({ 'lineItems[0].Quantity': 'must be > 0', supplierId: 'required' })
    expect(error.displayMessage).toBe('Please correct the highlighted errors.')
  })

  it('surfaces 403 on an over-limit approval without clearing the session', async () => {
    localStorage.setItem('stockpilot_token', 'jwt-abc')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    record('post', '/api/procurement/proposals/p-1/decision', () => HttpResponse.json({ title: 'Approval limit exceeded' }, { status: 403 }))

    const error = await proposalsApi.decide('p-1', { decision: 0 }).catch((e) => e)

    expect(error.response.status).toBe(403)
    expect(error.displayMessage).toBe('Approval limit exceeded')
    expect(localStorage.getItem('stockpilot_token')).toBe('jwt-abc')
  })

  it('clears the stored session on 401', async () => {
    localStorage.setItem('stockpilot_token', 'expired')
    localStorage.setItem('stockpilot_user', '{"role":"BranchManager"}')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    record('get', '/api/procurement/proposals/p-1', () => HttpResponse.json({}, { status: 401 }))

    await proposalsApi.getById('p-1').catch(() => {})

    expect(localStorage.getItem('stockpilot_token')).toBeNull()
    expect(localStorage.getItem('stockpilot_user')).toBeNull()
  })

  it('reports a network failure distinctly', async () => {
    server.use(http.get(`${API}/api/procurement/orders`, () => HttpResponse.error()))

    const error = await ordersApi.list().catch((e) => e)

    expect(error.displayMessage).toBe('Network error or server unavailable.')
  })

  it('approves an agent workflow through the human-gate endpoint', async () => {
    localStorage.setItem('stockpilot_token', 'jwt-pm')
    const requests = record('post', '/api/agent-workflows/wf-1/approve', () => HttpResponse.json({ id: 'p-1', status: 2 }))

    const res = await agentWorkflowsApi.approve('wf-1', 'Reviewed')

    expect(requests[0]).toMatchObject({ auth: 'Bearer jwt-pm', body: { comment: 'Reviewed' } })
    expect(res.data.status).toBe(2)
  })

  it('returns the agent result on 422 as an error the caller can read', async () => {
    record('post', '/api/agent-workflows/procurement/start', () =>
      HttpResponse.json({ workflowId: 'wf-2', proposalId: null, status: 'ChecksFailed', errors: ['Checks failed: budget check failed.'] }, { status: 422 })
    )

    const error = await agentWorkflowsApi.start({ triggerType: 'LowStock' }).catch((e) => e)

    expect(error.response.status).toBe(422)
    expect(error.response.data.status).toBe('ChecksFailed')
  })
})

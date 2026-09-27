import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import NewProposalPage from '../NewProposalPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { API, server } from '../../../test/server'

const BRANCH = '11111111-1111-1111-1111-111111111111'
const SUPPLIER = '22222222-2222-2222-2222-222222222222'
const QUOTATION = '33333333-3333-3333-3333-333333333333'
const PRODUCT = '44444444-4444-4444-4444-444444444441'

/** Serves the catalogs the form loads and records every create request. */
function serveCatalogs() {
  const created = []
  server.use(
    http.get(`${API}/api/products`, () => HttpResponse.json([{ productId: PRODUCT, name: 'Copy Paper A4', sku: 'PPR-A4' }])),
    http.get(`${API}/api/branches`, () => HttpResponse.json([{ id: BRANCH, name: 'Colombo Central', code: 'COL-01' }])),
    http.post(`${API}/api/procurement/proposals`, async ({ request }) => {
      created.push(await request.json())
      return HttpResponse.json({ id: 'new-proposal-id' }, { status: 201 })
    })
  )
  return created
}

function renderForm() {
  return renderWithProviders(<NewProposalPage />, { role: 'BranchManager', path: '/procurement/proposals/new', route: '/procurement/proposals/new' })
}

const supplierInput = () => screen.getByPlaceholderText('e.g. 22222222-2222-2222-2222-222222222222')
const quotationInput = () => screen.getByPlaceholderText('Link to a supplier quotation, if one exists')
const quantityInput = () => screen.getAllByRole('spinbutton')[0]
const priceInput = () => screen.getAllByRole('spinbutton')[1]
const submit = () => screen.getByRole('button', { name: 'Submit for Approval' })

async function fillValid(user) {
  await user.click(await screen.findByText('— Select a branch —'))
  await user.click(await screen.findByText('Colombo Central (COL-01)'))
  await user.type(supplierInput(), SUPPLIER)
  await user.click(screen.getByText('— Select a product —'))
  await user.click(await screen.findByText('Copy Paper A4 (PPR-A4)'))
  await user.clear(quantityInput())
  await user.type(quantityInput(), '12')
  await user.type(priceInput(), '499.5')
}

describe('NewProposalForm validation', () => {
  it('reports every required field and sends nothing when submitted empty', async () => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await screen.findByText('— Select a branch —')

    await user.click(submit())

    expect(screen.getByText('Branch is required.')).toBeInTheDocument()
    expect(screen.getByText('Supplier is required.')).toBeInTheDocument()
    expect(screen.getByText('Required.')).toBeInTheDocument()
    expect(screen.getByText('Must be 0 or greater.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it.each([['-3'], ['0'], ['1.5']])('rejects quantity %s', async (quantity) => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await fillValid(user)

    await user.clear(quantityInput())
    await user.type(quantityInput(), quantity)
    await user.click(submit())

    expect(screen.getByText('Must be a positive whole number.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('rejects a negative unit price', async () => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await fillValid(user)

    await user.clear(priceInput())
    await user.type(priceInput(), '-1')
    await user.click(submit())

    expect(screen.getByText('Must be 0 or greater.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('rejects malformed supplier and quotation IDs', async () => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await fillValid(user)

    await user.clear(supplierInput())
    await user.type(supplierInput(), 'acme-supplies')
    await user.type(quotationInput(), '1234')
    await user.click(submit())

    expect(screen.getByText('Must be a valid supplier ID (GUID).')).toBeInTheDocument()
    expect(screen.getByText('Must be a valid quotation ID (GUID).')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('submits a typed payload for approval and opens the new proposal', async () => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await fillValid(user)
    await user.type(quotationInput(), `  ${QUOTATION}  `)

    await user.click(submit())

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/procurement/proposals/new-proposal-id'))
    expect(created).toEqual([
      {
        branchId: BRANCH,
        supplierId: SUPPLIER,
        quotationId: QUOTATION,
        justification: null,
        createdByAgent: false,
        lineItems: [{ productId: PRODUCT, quantity: 12, unitPrice: 499.5 }],
        submitForApproval: true,
      },
    ])
  })

  it('Save as Draft sends submitForApproval=false', async () => {
    const created = serveCatalogs()
    const { user } = renderForm()
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0].submitForApproval).toBe(false)
  })

  it('shows the server reason when the proposal is over budget (422)', async () => {
    serveCatalogs()
    server.use(
      http.post(`${API}/api/procurement/proposals`, () =>
        HttpResponse.json({ title: 'Budget exceeded', detail: 'Requested amount exceeds remaining budget.' }, { status: 422 })
      )
    )
    const { user } = renderForm()
    await fillValid(user)

    await user.click(submit())

    expect(await screen.findByText('Requested amount exceeds remaining budget.')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/procurement/proposals/new')
  })

  it('shows server-side field errors from a 400 ProblemDetails', async () => {
    serveCatalogs()
    server.use(
      http.post(`${API}/api/procurement/proposals`, () =>
        HttpResponse.json({ title: 'Validation failed', status: 400, errors: { SupplierId: ['Supplier is inactive or blocked.'] } }, { status: 400 })
      )
    )
    const { user } = renderForm()
    await fillValid(user)

    await user.click(submit())

    expect(await screen.findByText('Please fix the validation errors below.')).toBeInTheDocument()
    expect(screen.getByText('Supplier is inactive or blocked.')).toBeInTheDocument()
  })
})

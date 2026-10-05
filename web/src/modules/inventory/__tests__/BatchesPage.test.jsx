import { describe, expect, it } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import BatchesPage from '../batches/BatchesPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { API, server } from '../../../test/server'

const BRANCH_1 = '11111111-1111-1111-1111-111111111111'
const BRANCH_2 = '22222222-2222-2222-2222-222222222222'
const PRODUCT_1 = '33333333-3333-3333-3333-333333333333'

function setupBatchesMocks() {
  const createdBatches = []

  server.use(
    http.get(`${API}/api/branches`, () =>
      HttpResponse.json({
        data: [
          { branchId: BRANCH_1, name: 'Colombo Main Branch', branchCode: 'COL-01', isActive: true },
          { branchId: BRANCH_2, name: 'Kandy Hub', branchCode: 'KDY-01', isActive: true },
        ],
      })
    ),
    http.get(`${API}/api/products`, () =>
      HttpResponse.json({
        data: [
          { productId: PRODUCT_1, name: 'Paracetamol 500mg', sku: 'MED-001', isActive: true },
        ],
      })
    ),
    http.get(`${API}/api/batches`, () =>
      HttpResponse.json({
        data: [
          {
            batchId: '99999999-9999-9999-9999-999999999999',
            productId: PRODUCT_1,
            productName: 'Paracetamol 500mg',
            sku: 'MED-001',
            branchId: BRANCH_1,
            branchName: 'Colombo Main Branch',
            batchNumber: 'LOT-2026-001',
            quantity: 500,
            unitCost: 15.5,
            manufacturingDate: '2026-01-01',
            expiryDate: '2027-01-01',
            receivedDate: '2026-01-05',
            status: 'Active',
            isExpired: false,
            isExpiringSoon: false,
          },
        ],
      })
    ),
    http.post(`${API}/api/batches`, async ({ request }) => {
      const body = await request.json()
      createdBatches.push(body)
      return HttpResponse.json({
        data: {
          batchId: '88888888-8888-8888-8888-888888888888',
          ...body,
          status: 'Active',
        },
        message: 'Batch created successfully.',
      }, { status: 201 })
    })
  )

  return createdBatches
}

function renderBatches() {
  return renderWithProviders(<BatchesPage />, { path: '/inventory/batches', route: '/inventory/batches' })
}

describe('BatchesPage and BatchModal validation', () => {
  it('loads batches and renders created branches in the add batch modal dropdown', async () => {
    setupBatchesMocks()
    const { user } = renderBatches()

    // Verify existing batch row is displayed
    expect(await screen.findByText('LOT-2026-001')).toBeInTheDocument()
    expect(screen.getByText('Colombo Main Branch')).toBeInTheDocument()

    // Open Add Batch Modal
    await user.click(screen.getByRole('button', { name: /Add Batch/i }))

    // Check modal opened
    expect(await screen.findByText('Add New Batch')).toBeInTheDocument()

    // Verify Branch select dropdown exists and has active branches populated
    const branchSelect = screen.getByLabelText(/Branch/i)
    expect(branchSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Colombo Main Branch \(COL-01\)/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Kandy Hub \(KDY-01\)/i })).toBeInTheDocument()
  })

  it('validates required fields and reports user-understandable errors', async () => {
    setupBatchesMocks()
    const { user } = renderBatches()

    await screen.findByText('LOT-2026-001')
    await user.click(screen.getByRole('button', { name: /Add Batch/i }))
    expect(await screen.findByText('Add New Batch')).toBeInTheDocument()

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /Create Batch/i }))

    expect(await screen.findByText('Please select a product.')).toBeInTheDocument()
    expect(screen.getByText('Please select a branch.')).toBeInTheDocument()
    expect(screen.getByText('Batch / Lot number is required.')).toBeInTheDocument()
    expect(screen.getByText('Quantity must be greater than zero.')).toBeInTheDocument()
    expect(screen.getByText('Expiry date is required.')).toBeInTheDocument()
  })

  it('rejects zero quantity and past expiry date', async () => {
    setupBatchesMocks()
    const { user } = renderBatches()

    await screen.findByText('LOT-2026-001')
    await user.click(screen.getByRole('button', { name: /Add Batch/i }))
    expect(await screen.findByText('Add New Batch')).toBeInTheDocument()

    // Fill in product, branch, and batch number
    await user.selectOptions(screen.getByLabelText(/Product/i), PRODUCT_1)
    await user.selectOptions(screen.getByLabelText(/Branch/i), BRANCH_2)
    await user.type(screen.getByLabelText(/Batch \/ Lot #/i), 'LOT-TEST-001')

    // Set 0 for quantity
    const qtyInput = screen.getByLabelText(/^Quantity/i)
    fireEvent.change(qtyInput, { target: { value: '0' } })

    // Set past expiry date
    const expInput = screen.getByLabelText(/Expiry Date/i)
    fireEvent.change(expInput, { target: { value: '2020-01-01' } })

    await user.click(screen.getByRole('button', { name: /Create Batch/i }))

    expect(await screen.findByText('Quantity must be greater than zero.')).toBeInTheDocument()
    expect(screen.getByText('Expiry date must be in the future for a new batch.')).toBeInTheDocument()
  })

  it('successfully submits valid batch with selected branch and typed values', async () => {
    const created = setupBatchesMocks()
    const { user } = renderBatches()

    await screen.findByText('LOT-2026-001')
    await user.click(screen.getByRole('button', { name: /Add Batch/i }))
    expect(await screen.findByText('Add New Batch')).toBeInTheDocument()

    // Fill valid form
    await user.selectOptions(screen.getByLabelText(/Product/i), PRODUCT_1)
    await user.selectOptions(screen.getByLabelText(/Branch/i), BRANCH_2)
    await user.type(screen.getByLabelText(/Batch \/ Lot #/i), 'LOT-KDY-2026')
    await user.type(screen.getByLabelText(/^Quantity/i), '150')
    await user.type(screen.getByLabelText(/Unit Cost/i), '25.75')
    await user.type(screen.getByLabelText(/Mfg Date/i), '2026-02-01')
    await user.type(screen.getByLabelText(/Expiry Date/i), '2028-12-31')

    await user.click(screen.getByRole('button', { name: /Create Batch/i }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]).toMatchObject({
      productId: PRODUCT_1,
      branchId: BRANCH_2,
      batchNumber: 'LOT-KDY-2026',
      quantity: 150,
      unitCost: 25.75,
    })
  })

  it('displays user-understandable error message from server 400 Validation ProblemDetails', async () => {
    server.use(
      http.get(`${API}/api/branches`, () => HttpResponse.json({ data: [{ branchId: BRANCH_1, name: 'Main Branch' }] })),
      http.get(`${API}/api/products`, () => HttpResponse.json({ data: [{ productId: PRODUCT_1, name: 'Product A' }] })),
      http.get(`${API}/api/batches`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/api/batches`, () =>
        HttpResponse.json(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: {
              BatchNumber: ["Batch number 'LOT-KDY-2026' already exists at this branch."],
            },
          },
          { status: 400 }
        )
      )
    )

    const { user } = renderBatches()

    await user.click(await screen.findByRole('button', { name: /Add Batch/i }))
    await user.selectOptions(screen.getByLabelText(/Product/i), PRODUCT_1)
    await user.selectOptions(screen.getByLabelText(/Branch/i), BRANCH_1)
    await user.type(screen.getByLabelText(/Batch \/ Lot #/i), 'LOT-KDY-2026')
    await user.type(screen.getByLabelText(/^Quantity/i), '10')
    await user.type(screen.getByLabelText(/Expiry Date/i), '2028-12-31')

    await user.click(screen.getByRole('button', { name: /Create Batch/i }))

    // Check user-friendly error is rendered
    expect(await screen.findByText(/Batch number 'LOT-KDY-2026' already exists at this branch\./i)).toBeInTheDocument()
  })
})

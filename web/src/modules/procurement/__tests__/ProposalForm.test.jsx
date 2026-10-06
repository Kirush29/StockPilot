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
function serveCatalogs(custom = {}) {
  const created = []
  server.use(
    http.get(`${API}/api/products`, () =>
      HttpResponse.json(
        custom.products ?? [{ productId: PRODUCT, name: 'Copy Paper A4', sku: 'PPR-A4' }]
      )
    ),
    http.get(`${API}/api/branches`, () =>
      HttpResponse.json(
        custom.branches ?? [{ id: BRANCH, name: 'Colombo Central', code: 'COL-01' }]
      )
    ),
    http.get(`${API}/api/Suppliers`, () =>
      HttpResponse.json(custom.suppliers ?? [])
    ),
    http.get(`${API}/api/Quotations`, () =>
      HttpResponse.json(custom.quotations ?? [])
    ),
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

const branchSelect = () => screen.getByLabelText(/Branch/i)
const supplierSelect = () => screen.getByLabelText(/Supplier/i)
const quotationSelect = () => screen.getByLabelText(/Quotation/i)
const productSelect = (idx = 0) => screen.getAllByLabelText(/Product/i)[idx]
const quantityInput = (idx = 0) => screen.getAllByRole('spinbutton')[idx * 2]
const priceInput = (idx = 0) => screen.getAllByRole('spinbutton')[idx * 2 + 1]
const submit = () => screen.getByRole('button', { name: 'Submit for Approval' })

async function fillValid(user) {
  await screen.findByRole('option', { name: /Colombo Central/i })
  await user.selectOptions(branchSelect(), BRANCH)
  await user.selectOptions(supplierSelect(), SUPPLIER)
  await user.selectOptions(productSelect(0), PRODUCT)
  await user.clear(quantityInput(0))
  await user.type(quantityInput(0), '12')
  await user.type(priceInput(0), '499.5')
}

describe('NewProposalForm validation', () => {
  it('reports every required field and sends nothing when submitted empty', async () => {
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
    const { user } = renderForm()
    await screen.findByRole('option', { name: /Colombo Central/i })

    await user.click(submit())

    expect(screen.getByText('Branch is required.')).toBeInTheDocument()
    expect(screen.getByText('Supplier is required.')).toBeInTheDocument()
    expect(screen.getByText('Required.')).toBeInTheDocument()
    expect(screen.getByText('Must be 0 or greater.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it.each([['-3'], ['0'], ['1.5']])('rejects quantity %s', async (quantity) => {
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
    const { user } = renderForm()
    await fillValid(user)

    await user.clear(quantityInput(0))
    await user.type(quantityInput(0), quantity)
    await user.click(submit())

    expect(screen.getByText('Must be a positive whole number.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('rejects a negative unit price', async () => {
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
    const { user } = renderForm()
    await fillValid(user)

    await user.clear(priceInput(0))
    await user.type(priceInput(0), '-1')
    await user.click(submit())

    expect(screen.getByText('Must be 0 or greater.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('requires supplier selection from the registered suppliers catalog', async () => {
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
    const { user } = renderForm()
    await fillValid(user)

    // Reset supplier to unselected option
    await user.selectOptions(supplierSelect(), '')
    await user.click(submit())

    expect(screen.getByText('Supplier is required.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('submits a selected payload for approval and opens the new proposal', async () => {
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
      quotations: [
        {
          id: QUOTATION,
          quotationReference: 'QUO-2026-001',
          supplierId: SUPPLIER,
          productId: PRODUCT,
          unitPrice: 499.5,
          quantity: 12,
          deliveryDays: 5,
          status: 'Accepted',
        },
      ],
    })
    const { user } = renderForm()
    await fillValid(user)
    await user.selectOptions(quotationSelect(), QUOTATION)

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
    const created = serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
    const { user } = renderForm()
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0].submitForApproval).toBe(false)
  })

  it('shows the server reason when the proposal is over budget (422)', async () => {
    serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
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
    serveCatalogs({
      suppliers: [{ id: SUPPLIER, name: 'Lanka Stationery Distributors', supplierCode: 'SUP-001' }],
    })
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

  it('auto-populates unit price, line total, and locks price when quotation is selected', async () => {
    const WRENCH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const QUOTE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const BUILDMASTER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

    serveCatalogs({
      products: [
        { productId: WRENCH_ID, name: 'Adjustable Wrench', sku: 'HRD-AW-003', costPrice: 1930 },
      ],
      suppliers: [
        { id: BUILDMASTER_ID, name: 'BuildMaster Hardware', supplierCode: 'SUP-001' },
      ],
      quotations: [
        {
          id: QUOTE_ID,
          quotationReference: 'QUO-2026-001',
          supplierId: BUILDMASTER_ID,
          productId: WRENCH_ID,
          unitPrice: 1930,
          quantity: 30,
          deliveryDays: 3,
          status: 'Accepted',
        },
      ],
    })

    const { user } = renderForm()
    await screen.findByRole('option', { name: /Colombo Central/i })

    // Select branch
    await user.selectOptions(branchSelect(), BRANCH)

    // Select supplier
    await user.selectOptions(supplierSelect(), BUILDMASTER_ID)

    // Select quotation
    await user.selectOptions(quotationSelect(), QUOTE_ID)

    // Verify product was auto-filled in line item
    expect(productSelect(0)).toHaveValue(WRENCH_ID)

    // Verify quantity auto-populated to 30
    expect(quantityInput(0)).toHaveValue(30)

    // Verify unit price was auto-populated and is read-only
    expect(priceInput(0)).toHaveValue(1930)
    expect(priceInput(0)).toHaveAttribute('readonly')
    expect(screen.getByText(/Quotation price/i)).toBeInTheDocument()

    // Verify line total and grand total: 30 x 1,930 = Rs. 57,900.00
    expect(screen.getAllByText('Rs. 57,900.00')).toHaveLength(2)
  })

  it('calculates multi-item hardware proposal total accurately to Rs. 142,150.00', async () => {
    const WRENCH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const HAMMER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    const SCREWDRIVER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    const BUILDMASTER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

    serveCatalogs({
      products: [
        { productId: WRENCH_ID, name: 'Adjustable Wrench', sku: 'HRD-AW-003', costPrice: 1930 },
        { productId: HAMMER_ID, name: 'Claw Hammer', sku: 'HRD-CH-001', costPrice: 1690 },
        { productId: SCREWDRIVER_ID, name: 'Screwdriver Set', sku: 'HRD-SS-002', costPrice: 2100 },
      ],
      suppliers: [
        { id: BUILDMASTER_ID, name: 'BuildMaster Hardware', supplierCode: 'SUP-001' },
      ],
      quotations: [
        {
          id: 'quote-wrench-id',
          quotationReference: 'QUO-WRENCH',
          supplierId: BUILDMASTER_ID,
          productId: WRENCH_ID,
          unitPrice: 1930,
          quantity: 30,
          deliveryDays: 3,
          status: 'Accepted',
        },
        {
          id: 'quote-hammer-id',
          quotationReference: 'QUO-HAMMER',
          supplierId: BUILDMASTER_ID,
          productId: HAMMER_ID,
          unitPrice: 1690,
          quantity: 25,
          deliveryDays: 4,
          status: 'Accepted',
        },
        {
          id: 'quote-driver-id',
          quotationReference: 'QUO-DRIVER',
          supplierId: BUILDMASTER_ID,
          productId: SCREWDRIVER_ID,
          unitPrice: 2100,
          quantity: 20,
          deliveryDays: 5,
          status: 'Accepted',
        },
      ],
    })

    const { user } = renderForm()
    await screen.findByRole('option', { name: /Colombo Central/i })

    // Pick branch and supplier
    await user.selectOptions(branchSelect(), BRANCH)
    await user.selectOptions(supplierSelect(), BUILDMASTER_ID)

    // Line 1: Adjustable Wrench
    await user.selectOptions(productSelect(0), WRENCH_ID)
    await user.clear(quantityInput(0))
    await user.type(quantityInput(0), '30')
    // Unit price auto-populated to 1930
    expect(priceInput(0)).toHaveValue(1930)

    // Add Line 2: Claw Hammer
    await user.click(screen.getByRole('button', { name: 'Add Line Item' }))
    await user.selectOptions(productSelect(1), HAMMER_ID)
    await user.clear(quantityInput(1))
    await user.type(quantityInput(1), '25')
    expect(priceInput(1)).toHaveValue(1690)

    // Add Line 3: Screwdriver Set
    await user.click(screen.getByRole('button', { name: 'Add Line Item' }))
    await user.selectOptions(productSelect(2), SCREWDRIVER_ID)
    await user.clear(quantityInput(2))
    await user.type(quantityInput(2), '20')
    expect(priceInput(2)).toHaveValue(2100)

    // Line totals:
    // 30 x 1,930 = 57,900.00
    // 25 x 1,690 = 42,250.00
    // 20 x 2,100 = 42,000.00
    // Grand total: 142,150.00
    expect(screen.getByText('Rs. 57,900.00')).toBeInTheDocument()
    expect(screen.getByText('Rs. 42,250.00')).toBeInTheDocument()
    expect(screen.getByText('Rs. 42,000.00')).toBeInTheDocument()
    expect(screen.getByText('Rs. 142,150.00')).toBeInTheDocument()
  })
})

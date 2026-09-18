// ProposalsListPage.jsx — browse procurement proposals with filters, sort and pagination
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { proposalsApi } from '../../api/procurementApi'
import { useProcurement } from '../../context/ProcurementContext'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { PlusIcon, RefreshIcon, ProductsIcon } from '../../components/ui/Icons'
import { ProposalStatus, proposalStatusMeta, formatCurrency, formatDate, formatGuid } from '../../utils/procurementEnums'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-totalEstimatedCost', label: 'Cost: high to low' },
  { value: 'totalEstimatedCost', label: 'Cost: low to high' },
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'status', label: 'Status' },
]

export default function ProposalsListPage() {
  const { canRaiseOrView } = useProcurement()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [sort, setSort] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await proposalsApi.list({
        status: status === '' ? undefined : status,
        supplierId: supplierId.trim() || undefined,
        sort,
        page,
        pageSize,
      })
      setItems(res.data?.items ?? [])
      setTotalPages(res.data?.totalPages ?? 0)
      setTotalCount(res.data?.totalCount ?? 0)
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) {
        setError('You do not have access to view procurement proposals.')
      } else {
        setError(err.response?.data?.detail ?? err.response?.data?.message ?? 'Failed to load proposals.')
      }
    } finally {
      setLoading(false)
    }
  }, [status, supplierId, sort, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetToFirstPage = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const hasFilters = status !== '' || supplierId.trim() !== ''

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Procurement Proposals</h1>
          <p>Draft, submit and track proposals awaiting approval</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
          {canRaiseOrView && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/procurement/proposals/new')}>
              <PlusIcon />
              New Proposal
            </button>
          )}
        </div>
      </div>

      {error && items.length > 0 && <ErrorState error={error} onRetry={loadData} inline />}

      <div className="toolbar-card">
        <div className="toolbar-left">
          <select
            className="form-control"
            style={{ flex: '0 0 190px' }}
            value={status}
            onChange={(e) => resetToFirstPage(setStatus)(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(ProposalStatus).map(([key, val]) => (
              <option key={key} value={val}>{proposalStatusMeta[val].label}</option>
            ))}
          </select>

          <input
            className="form-control"
            style={{ flex: '0 0 260px' }}
            type="text"
            placeholder="Filter by supplier ID (GUID)…"
            value={supplierId}
            onChange={(e) => resetToFirstPage(setSupplierId)(e.target.value)}
          />

          <select className="form-control" style={{ flex: '0 0 190px' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setStatus(''); setSupplierId(''); setPage(1) }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} title="Loading proposals…" />
      ) : error && items.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={loadData} />
        </div>
      ) : items.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={ProductsIcon}
            title={hasFilters ? 'No proposals match your filters' : 'No proposals yet'}
            description={hasFilters ? 'Try a different status or supplier.' : 'Get started by creating your first procurement proposal.'}
            actionLabel={canRaiseOrView ? (hasFilters ? 'Clear Filters' : 'New Proposal') : undefined}
            actionIcon={hasFilters ? undefined : PlusIcon}
            onAction={
              canRaiseOrView
                ? hasFilters
                  ? () => { setStatus(''); setSupplierId(''); setPage(1) }
                  : () => navigate('/procurement/proposals/new')
                : undefined
            }
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Proposals</span>
              <span className="count-badge">{totalCount} total</span>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Estimated Cost</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const meta = proposalStatusMeta[p.status] ?? { label: 'Unknown', variant: 'neutral' }
                  return (
                    <tr key={p.id} className="clickable-row" onClick={() => navigate(`/procurement/proposals/${p.id}`)}>
                      <td><span className="sku-pill" title={p.branchId}>{formatGuid(p.branchId)}</span></td>
                      <td><span className="sku-pill" title={p.supplierId}>{formatGuid(p.supplierId)}</span></td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{formatCurrency(p.totalEstimatedCost)}</strong>
                      </td>
                      <td><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {p.createdByAgent ? 'Procurement Agent' : 'Manual'}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(p.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="table-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)' }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

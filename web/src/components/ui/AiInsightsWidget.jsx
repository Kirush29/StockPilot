import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { optimizationApi, branchesApi } from '../../api/inventoryApi'
import Badge from './Badge'
import { CardSkeleton } from './Skeleton'

export default function AiInsightsWidget() {
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [error, setError] = useState(null)

  const fetchBranches = useCallback(async () => {
    try {
      const res = await branchesApi.getAll()
      const list = res.data?.data ?? []
      setBranches(list)
      if (list.length > 0) {
        setSelectedBranch(list[0].branchId)
      }
    } catch (err) {
      setError('Failed to load branches.')
    }
  }, [])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const fetchRecommendations = useCallback(async () => {
    if (!selectedBranch) return
    setLoading(true)
    setError(null)
    try {
      const res = await optimizationApi.getRecommendations(selectedBranch)
      setRecommendations(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load insights.')
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const handleGenerate = async () => {
    if (!selectedBranch) return
    setGenerating(true)
    setError(null)
    try {
      const res = await optimizationApi.analyze(selectedBranch)
      setRecommendations(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to generate insights.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAction = async (rec, action) => {
    try {
      setActionLoadingId(rec.recommendationId)
      if (action === 'Approve') {
        const res = await optimizationApi.approve(rec.recommendationId)
        const updatedRec = res.data?.data || res.data
        setRecommendations(prev => prev.map(r => r.recommendationId === rec.recommendationId ? updatedRec : r))
      } else if (action === 'Reject') {
        const reason = window.prompt("Reason for dismissal:")
        if (!reason) {
          setActionLoadingId(null)
          return // Cancelled
        }
        await optimizationApi.reject(rec.recommendationId, reason)
        setRecommendations(prev => prev.filter(r => r.recommendationId !== rec.recommendationId))
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail 
        || err.response?.data?.message 
        || (typeof err.response?.data === 'string' ? err.response?.data : null)
        || err.message 
        || 'Failed to apply action.'
      alert('Action notice: ' + errMsg)
    } finally {
      setActionLoadingId(null)
    }
  }

  if (branches.length === 0 && !loading) {
    return null
  }

  return (
    <div className="table-card" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="table-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="table-card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              ✨ AI Optimization Insights
            </span>
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Semantic Kernel powered inventory recommendations
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <select 
            className="form-control" 
            style={{ width: 'auto', padding: '4px 30px 4px 10px', fontSize: 'var(--font-size-xs)' }}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleGenerate}
            disabled={generating || loading || !selectedBranch}
          >
            {generating ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-4)' }}><CardSkeleton /></div>
      ) : error ? (
        <div className="alert alert-danger" style={{ margin: 'var(--space-4)' }}>{error}</div>
      ) : recommendations.length === 0 ? (
        <div style={{ padding: 'var(--space-6) var(--space-4)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No pending recommendations for this branch.
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={handleGenerate} disabled={generating}>
            Run Analysis Now
          </button>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Recommendation & Reasoning</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map(rec => {
                const isTransfer = rec.recommendationType === 'Transfer'
                const isReorder = rec.recommendationType === 'Reorder'
                const isActionBusy = actionLoadingId === rec.recommendationId

                return (
                  <tr key={rec.recommendationId}>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Badge variant={isTransfer ? 'info' : isReorder ? 'warning' : 'secondary'}>
                          {rec.recommendationType}
                        </Badge>
                        <Badge variant={rec.priority === 'Critical' ? 'danger' : 'secondary'}>
                          {rec.priority || 'High'}
                        </Badge>
                      </div>
                    </td>
                    <td>
                      <strong>{rec.product?.name ?? 'Unknown'}</strong>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        Issue: {rec.issueType || 'LowStock'}
                      </div>
                    </td>
                    <td>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          Suggest {rec.suggestedQuantity} units
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
                          {Math.round(rec.confidenceScore * 100)}% Match
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {rec.reasoning}
                      </p>
                    </td>
                    <td>
                      {rec.status === 'TransferCreated' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>Transfer Created</span>
                          <Link to="/inventory/transfers" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>View Transfers →</Link>
                        </div>
                      ) : rec.status === 'Approved' ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>Approved</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isTransfer ? (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleAction(rec, 'Approve')}
                              disabled={isActionBusy}
                            >
                              {isActionBusy ? 'Approving…' : 'Approve Transfer'}
                            </button>
                          ) : (
                            <Link
                              to={`/procurement/replenishment?branchId=${rec.destinationBranchId}&productId=${rec.productId}`}
                              className="btn btn-primary btn-sm"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              Order via Procurement →
                            </Link>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleAction(rec, 'Reject')}
                            disabled={isActionBusy}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { proposalsApi } from '../../api/procurementApi'
import ProposalForm from './ProposalForm'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { ProposalStatus, proposalStatusMeta } from '../../utils/procurementEnums'
import '../../styles/inventory.css'

export default function EditProposalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await proposalsApi.getById(id)
      setProposal(res.data)
    } catch (err) {
      const s = err.response?.status
      if (s === 404) setError('This proposal no longer exists.')
      else if (s === 401 || s === 403) setError('You do not have access to this proposal.')
      else setError(err.response?.data?.detail ?? 'Failed to load the proposal.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <TableSkeleton rows={4} columns={4} title="Loading proposal…" />
  if (error) return <ErrorState error={error} onRetry={load} />

  const isEditable = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.RevisionRequested
  if (!isEditable) {
    return (
      <EmptyState
        title="This proposal can't be edited"
        description={`Only Draft or Revision Requested proposals can be edited. This one is ${proposalStatusMeta[proposal.status]?.label ?? 'in an unknown status'}.`}
        actionLabel="View Proposal"
        onAction={() => navigate(`/procurement/proposals/${id}`)}
      />
    )
  }

  return <ProposalForm initial={proposal} />
}

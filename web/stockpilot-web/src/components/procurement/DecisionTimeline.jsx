// DecisionTimeline.jsx — vertical timeline of approval decisions on a proposal
import React from 'react'
import Badge from '../ui/Badge'
import { decisionMeta, formatDateTime } from '../../utils/procurementEnums'

export default function DecisionTimeline({ decisions }) {
  if (!decisions || decisions.length === 0) {
    return <p className="timeline-empty">No decisions recorded yet — this proposal is still awaiting review.</p>
  }

  const sorted = [...decisions].sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt))

  return (
    <ol className="decision-timeline">
      {sorted.map((decision) => {
        const meta = decisionMeta[decision.decision] ?? { label: 'Unknown', variant: 'neutral' }
        return (
          <li key={decision.id} className="decision-timeline-item">
            <span className={`decision-timeline-dot dot-${meta.variant}`} aria-hidden="true" />
            <div className="decision-timeline-content">
              <div className="decision-timeline-head">
                <Badge variant={meta.variant}>{meta.label}</Badge>
                <span className="decision-timeline-date">{formatDateTime(decision.decidedAt)}</span>
              </div>
              {decision.comment && <p className="decision-timeline-comment">{decision.comment}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

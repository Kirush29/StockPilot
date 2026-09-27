// Mirrors the integer enum ordinals StockPilot.Procurement.Domain.Enums serializes as
// (System.Text.Json's default is numeric, not string — keep these in sync with the backend).

export const ProposalStatus = {
  Draft: 0,
  PendingApproval: 1,
  Approved: 2,
  Rejected: 3,
  RevisionRequested: 4,
  Converted: 5,
}

export const proposalStatusMeta = {
  [ProposalStatus.Draft]: { label: 'Draft', variant: 'neutral' },
  [ProposalStatus.PendingApproval]: { label: 'Pending Approval', variant: 'warning' },
  [ProposalStatus.Approved]: { label: 'Approved', variant: 'success' },
  [ProposalStatus.Rejected]: { label: 'Rejected', variant: 'danger' },
  [ProposalStatus.RevisionRequested]: { label: 'Revision Requested', variant: 'warning' },
  [ProposalStatus.Converted]: { label: 'Converted', variant: 'info' },
}

export const ApprovalDecisionType = {
  Approved: 0,
  Rejected: 1,
  RevisionRequested: 2,
}

export const decisionMeta = {
  [ApprovalDecisionType.Approved]: { label: 'Approved', variant: 'success' },
  [ApprovalDecisionType.Rejected]: { label: 'Rejected', variant: 'danger' },
  [ApprovalDecisionType.RevisionRequested]: { label: 'Revision Requested', variant: 'warning' },
}

export const PurchaseOrderStatus = {
  Ordered: 0,
  PartiallyReceived: 1,
  Received: 2,
  Cancelled: 3,
}

export const orderStatusMeta = {
  [PurchaseOrderStatus.Ordered]: { label: 'Ordered', variant: 'info' },
  [PurchaseOrderStatus.PartiallyReceived]: { label: 'Partially Received', variant: 'warning' },
  [PurchaseOrderStatus.Received]: { label: 'Received', variant: 'success' },
  [PurchaseOrderStatus.Cancelled]: { label: 'Cancelled', variant: 'danger' },
}

// Matches OrdersController.AllowedTransitions server-side; used only to decide which actions to
// offer in the UI — the server re-validates and is the source of truth.
export const allowedOrderTransitions = {
  [PurchaseOrderStatus.Ordered]: [PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled],
  [PurchaseOrderStatus.PartiallyReceived]: [PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled],
  [PurchaseOrderStatus.Received]: [],
  [PurchaseOrderStatus.Cancelled]: [],
}

// Mirrors Procurement:ApprovalLimits in the backend's appsettings.json. This is used only to
// pre-filter/annotate the Approval Queue UI — the server (Procurement:ApprovalLimits +
// ProcurementApprovalHandler) is the actual authorization boundary and re-checks this on every
// decision regardless of what the client filtered.
export const APPROVAL_LIMITS = {
  ProcurementManager: 50000,
  BusinessOwner: null, // null = unlimited
}

export function isWithinApprovalLimit(role, amount) {
  if (!(role in APPROVAL_LIMITS)) return false
  const limit = APPROVAL_LIMITS[role]
  return limit === null || Number(amount) <= limit
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function formatGuid(id, length = 8) {
  if (!id) return '—'
  return `${id.slice(0, length)}…`
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

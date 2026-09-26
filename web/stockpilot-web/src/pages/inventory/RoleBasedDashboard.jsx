import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BusinessOwnerDashboard from './BusinessOwnerDashboard'
import ProcurementDashboard from './ProcurementDashboard'
import BranchManagerDashboard from './BranchManagerDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import ErrorState from '../../components/ui/ErrorState'

export default function RoleBasedDashboard() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role) {
    case 'BusinessOwner':
      return <BusinessOwnerDashboard />
    case 'ProcurementManager':
      return <ProcurementDashboard />
    case 'BranchManager':
      return <BranchManagerDashboard />
    case 'StoreEmployee':
      return <EmployeeDashboard />
    default:
      return <ErrorState error={`Unknown role: ${user.role}`} />
  }
}

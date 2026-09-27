import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Users from './pages/Users';
import Home from './pages/Home';
import Suppliers from './pages/Suppliers';
import Quotations from './pages/Quotations';
import Evaluation from './pages/Evaluation';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import BusinessOwnerDashboard from './pages/dashboards/BusinessOwnerDashboard';
import BranchManagerDashboard from './pages/dashboards/BranchManagerDashboard';
import ProcurementDashboard from './pages/dashboards/ProcurementDashboard';
import InventoryDashboard from './pages/dashboards/InventoryDashboard';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'profile', element: <Profile /> },
          { path: 'suppliers', element: <Suppliers /> },
          { path: 'quotations', element: <Quotations /> },
          { path: 'evaluation', element: <Evaluation /> },
          {
            path: 'inventory/dashboard',
            element: <InventoryDashboard />
          },
          {
            path: 'owner',
            element: <ProtectedRoute roles={['SystemAdministrator', 'BusinessOwner']} />,
            children: [{ index: true, element: <BusinessOwnerDashboard /> }]
          },
          {
            path: 'users',
            element: <ProtectedRoute roles={['SystemAdministrator', 'BusinessOwner']} />,
            children: [{ index: true, element: <Users /> }]
          },
          {
            path: 'branch',
            element: <ProtectedRoute roles={['SystemAdministrator', 'BranchManager']} />,
            children: [{ index: true, element: <BranchManagerDashboard /> }]
          },
          {
            path: 'procurement',
            element: <ProtectedRoute roles={['SystemAdministrator', 'Procurement', 'ProcurementManager']} />,
            children: [{ index: true, element: <ProcurementDashboard /> }]
          },
        ],
      }
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> }
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;

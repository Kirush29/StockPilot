import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Suppliers from './pages/Suppliers';
import Quotations from './pages/Quotations';
import Evaluation from './pages/Evaluation';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'suppliers', element: <Suppliers /> },
      { path: 'quotations', element: <Quotations /> },
      { path: 'evaluation', element: <Evaluation /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

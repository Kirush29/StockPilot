import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-left">
      <header className="bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600 m-0">StockPilot</h1>
        <nav className="flex gap-4">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Home</Link>
          <Link to="/suppliers" className="text-gray-600 hover:text-blue-600 font-medium">Suppliers</Link>
          <Link to="/quotations" className="text-gray-600 hover:text-blue-600 font-medium">Quotations</Link>
          <Link to="/evaluation" className="text-gray-600 hover:text-blue-600 font-medium">Evaluation</Link>
        </nav>
      </header>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

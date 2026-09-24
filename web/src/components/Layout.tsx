import { Outlet, Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full text-left">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              StockPilot
            </span>
          </Link>
          <nav className="flex gap-6">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/suppliers" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Suppliers</Link>
            <Link to="/quotations" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Quotations</Link>
            <Link to="/evaluation" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Evaluation</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

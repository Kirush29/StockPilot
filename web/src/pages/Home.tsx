import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, FileText, Clock, AlertCircle, ArrowRight, Activity, TrendingUp, Package } from 'lucide-react';
import { supplierService, type Supplier } from '../services/supplierService';
import { quotationService, type Quotation } from '../services/quotationService';
import { productService, type Product } from '../services/productService';

export default function Home() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suppliersData, quotationsData, productsData] = await Promise.all([
        supplierService.getAllSuppliers(),
        quotationService.getAllQuotations(),
        productService.getAllProducts()
      ]);
      setSuppliers(suppliersData || []);
      setQuotations(quotationsData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSuppliersCount = suppliers.filter(s => s.isActive && !s.isBlocked).length;
  const pendingQuotationsCount = quotations.filter(q => q.status === 'Pending').length;

  // Sort quotations by submittedAt (newest first) and take the top 5
  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 max-w-md mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
          <p className="text-gray-500 mt-1">Welcome back to the StockPilot Management Portal.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link
            to="/suppliers"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Suppliers
          </Link>
          <Link
            to="/quotations"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Quotations
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Suppliers"
          value={suppliers.length}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Active Suppliers"
          value={activeSuppliersCount}
          icon={<UserCheck className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Total Quotations"
          value={quotations.length}
          icon={<FileText className="w-6 h-6 text-purple-600" />}
          bgColor="bg-purple-50"
        />
        <MetricCard
          title="Pending Quotations"
          value={pendingQuotationsCount}
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          bgColor="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-gray-500" />
              Recent Quotations
            </h3>
            <Link to="/quotations" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="p-0 flex-1 flex flex-col">
            {recentQuotations.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {recentQuotations.map((quotation) => {
                  const product = products.find(p => p.id === quotation.productId);
                  const supplier = suppliers.find(s => s.id === quotation.supplierId);
                  return (
                  <li key={quotation.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product ? `${product.name} (${product.sku})` : 'Unknown Product'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {supplier ? `${supplier.name} (${supplier.supplierCode})` : 'Unknown Supplier'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted: {new Date(quotation.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900 mb-2">
                          Rs. {quotation.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-500 font-normal">x {quotation.quantity}</span>
                        </span>
                        <StatusBadge status={quotation.status} />
                      </div>
                    </div>
                  </li>
                );
                })}
              </ul>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium mb-1">No quotations found</p>
                <p className="text-sm text-gray-400 mb-4">There are currently no quotations in the system.</p>
                <Link
                  to="/quotations"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Manage Quotations
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-gray-500" />
              Quick Actions
            </h3>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              <QuickActionLink
                to="/suppliers"
                icon={<Users className="w-5 h-5 text-blue-600" />}
                title="Manage Suppliers"
                description="View, add, or edit supplier details"
                bgColor="bg-blue-50"
              />
              <QuickActionLink
                to="/quotations"
                icon={<FileText className="w-5 h-5 text-purple-600" />}
                title="Manage Quotations"
                description="Review and process quotes"
                bgColor="bg-purple-50"
              />
              <QuickActionLink
                to="/evaluation"
                icon={<Package className="w-5 h-5 text-emerald-600" />}
                title="Supplier Evaluation"
                description="Assess supplier performance"
                bgColor="bg-emerald-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, bgColor }: { title: string, value: number | string, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = "bg-gray-100";
  let text = "text-gray-800";

  if (status === 'Pending') {
    bg = "bg-orange-100";
    text = "text-orange-800";
  } else if (status === 'Accepted') {
    bg = "bg-green-100";
    text = "text-green-800";
  } else if (status === 'Rejected') {
    bg = "bg-red-100";
    text = "text-red-800";
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {status}
    </span>
  );
}

function QuickActionLink({ to, icon, title, description, bgColor }: { to: string, icon: React.ReactNode, title: string, description: string, bgColor: string }) {
  return (
    <Link
      to={to}
      className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mr-3 ${bgColor}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center h-10">
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
    </Link>
  );
}

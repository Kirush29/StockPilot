import { useEffect, useState } from 'react';
import { type Supplier, type SupplierRating, supplierService, type SaveSupplierRequest, type CreateSupplierRatingRequest } from '../services/supplierService';
import { Search, Plus, Edit2, Trash2, Star, X, AlertCircle, Building2 } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Deactivation states
  const [deactivatingSupplier, setDeactivatingSupplier] = useState<Supplier | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Ratings states
  const [ratingsOpenSupplier, setRatingsOpenSupplier] = useState<Supplier | null>(null);
  const [ratings, setRatings] = useState<SupplierRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingFormError, setRatingFormError] = useState<string | null>(null);
  const [ratingFormData, setRatingFormData] = useState({
    rating: '',
    comment: ''
  });

  const [formData, setFormData] = useState({
    supplierCode: '',
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supplierService.getAllSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await supplierService.getAllSuppliers();
        if (isMounted) setSuppliers(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load suppliers.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) return;

    try {
      setIsSearching(true);
      setError(null);
      const data = await supplierService.searchSuppliers(keyword);
      setSuppliers(data);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Failed to search suppliers.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClear = async () => {
    setSearchKeyword('');
    setHasSearched(false);
    await fetchSuppliers();
  };

  const openAddForm = () => {
    setEditingSupplier(null);
    setFormData({
      supplierCode: '',
      name: '',
      contactEmail: '',
      contactPhone: '',
      address: ''
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      address: supplier.address
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openDeactivateConfirm = (supplier: Supplier) => {
    setDeactivateError(null);
    setDeactivatingSupplier(supplier);
  };

  const openRatings = async (supplier: Supplier) => {
    setRatingsOpenSupplier(supplier);
    setRatings([]);
    setRatingFormData({ rating: '', comment: '' });
    setRatingFormError(null);
    await fetchRatings(supplier.id);
  };

  const fetchRatings = async (supplierId: string) => {
    try {
      setRatingsLoading(true);
      setRatingsError(null);
      const data = await supplierService.getSupplierRatings(supplierId);
      setRatings(data);
    } catch (err: any) {
      setRatingsError(err.message || 'Failed to load ratings.');
    } finally {
      setRatingsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRatingFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.supplierCode.trim()) return 'Supplier Code is required.';
    if (!formData.name.trim()) return 'Supplier Name is required.';
    if (!formData.contactEmail.trim()) return 'Contact Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(formData.contactEmail)) return 'Contact Email must be a valid email format.';
    if (!formData.contactPhone.trim()) return 'Contact Phone is required.';
    if (!formData.address.trim()) return 'Address is required.';
    return null;
  };

  const validateRatingForm = () => {
    const r = parseFloat(ratingFormData.rating);
    if (isNaN(r)) return 'Rating is required and must be a number.';
    if (r < 1 || r > 5) return 'Rating must be between 1 and 5.';
    return null;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload: SaveSupplierRequest = {
        supplierCode: formData.supplierCode.trim(),
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        address: formData.address.trim(),
        rating: editingSupplier ? editingSupplier.rating : 0,
        isActive: editingSupplier ? editingSupplier.isActive : true,
        isBlocked: editingSupplier ? editingSupplier.isBlocked : false,
      };

      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, payload);
      } else {
        await supplierService.createSupplier(payload);
      }
      
      setIsFormOpen(false);
      setSearchKeyword('');
      setHasSearched(false);
      await fetchSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateSubmit = async () => {
    if (!deactivatingSupplier) return;
    
    setDeactivateError(null);
    setIsDeactivating(true);
    
    try {
      await supplierService.deactivateSupplier(deactivatingSupplier.id);
      setDeactivatingSupplier(null);
      setSearchKeyword('');
      setHasSearched(false);
      await fetchSuppliers();
    } catch (err: any) {
      setDeactivateError(err.message || 'Failed to deactivate supplier.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingsOpenSupplier) return;

    setRatingFormError(null);
    const validationError = validateRatingForm();
    if (validationError) {
      setRatingFormError(validationError);
      return;
    }

    try {
      setRatingSubmitting(true);
      const payload: CreateSupplierRatingRequest = {
        rating: parseFloat(ratingFormData.rating),
        comment: ratingFormData.comment.trim()
      };
      
      await supplierService.addSupplierRating(ratingsOpenSupplier.id, payload);
      
      setRatingFormData({ rating: '', comment: '' });
      await fetchRatings(ratingsOpenSupplier.id);
      
      const updatedList = await supplierService.getAllSuppliers();
      setSuppliers(updatedList);
      
    } catch (err: any) {
      setRatingFormError(err.message || 'Failed to add rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const activeSuppliersCount = suppliers.filter(s => s.isActive).length;

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your vendor network and evaluate performance.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {suppliers.length > 0 && !loading && !error && (
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total / Active</span>
              <span className="text-sm font-semibold text-slate-700">{suppliers.length} / {activeSuppliersCount}</span>
            </div>
          )}
          <button 
            onClick={openAddForm}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by name, code, or contact..."
              className="w-full pl-9 pr-10 py-2.5 border-transparent bg-slate-50 hover:bg-slate-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm transition-all outline-none"
              disabled={isSearching || loading}
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchKeyword.trim() || isSearching || loading}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[100px] shadow-sm"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading suppliers</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      ) : loading || isSearching ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Name & Contact</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded-full w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded w-16"></div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-slate-200 rounded"></div>
                        <div className="h-8 w-8 bg-slate-200 rounded"></div>
                        <div className="h-8 w-8 bg-slate-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">
            {hasSearched ? 'No results found' : 'No suppliers yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {hasSearched 
              ? `We couldn't find any suppliers matching "${searchKeyword}". Try checking for typos or using different terms.`
              : 'Get started by adding your first vendor to the system to manage inventory sourcing and evaluations.'}
          </p>
          {!hasSearched && (
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Name & Contact</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 group">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 font-mono">
                        {supplier.supplierCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{supplier.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{supplier.contactEmail}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{supplier.contactPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {supplier.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {supplier.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Inactive
                          </span>
                        )}
                        {supplier.isBlocked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openRatings(supplier)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          aria-label="View Ratings"
                          title="View Ratings"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(supplier)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Edit Supplier"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {supplier.isActive && (
                          <button
                            onClick={() => openDeactivateConfirm(supplier)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            aria-label="Deactivate Supplier"
                            title="Deactivate Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {formError && (
                <div className="mb-6 bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{formError}</p>
                </div>
              )}
              
              <form id="supplier-form" onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier Code</label>
                  <input 
                    type="text" 
                    name="supplierCode"
                    value={formData.supplierCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g. SUP-001"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Acme Corp"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Email</label>
                  <input 
                    type="email" 
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="contact@example.com"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label>
                  <input 
                    type="text" 
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+1 (555) 000-0000"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                  <textarea 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    rows={3}
                    placeholder="Full Business Address"
                    disabled={isSubmitting}
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="supplier-form"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {deactivatingSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Deactivate Supplier</h3>
              {deactivateError && (
                <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-lg text-sm text-rose-700">
                  {deactivateError}
                </div>
              )}
              <p className="text-slate-600 text-sm">
                Are you sure you want to deactivate <span className="font-semibold text-slate-900">{deactivatingSupplier.name}</span> ({deactivatingSupplier.supplierCode})? 
                This action will mark the supplier as inactive but will not permanently delete their data.
              </p>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setDeactivatingSupplier(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeactivateSubmit}
                disabled={isDeactivating}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ratings Modal */}
      {ratingsOpenSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Supplier Ratings</h3>
                <p className="text-sm text-slate-500">{ratingsOpenSupplier.name}</p>
              </div>
              <button 
                onClick={() => setRatingsOpenSupplier(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-slate-50 space-y-6">
              {/* Add Rating Form */}
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <h4 className="text-sm font-semibold text-slate-900 mb-4">Add New Rating</h4>
                {ratingFormError && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-lg text-sm text-rose-700 flex items-start gap-2">
                     <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                     {ratingFormError}
                  </div>
                )}
                <form onSubmit={handleRatingSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-24">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Score (1-5)</label>
                      <input 
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        name="rating"
                        value={ratingFormData.rating}
                        onChange={handleRatingInputChange}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="0.0"
                        disabled={ratingSubmitting}
                      />
                    </div>
                    <div className="flex-grow">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Comment (Optional)</label>
                      <textarea 
                        name="comment"
                        value={ratingFormData.comment}
                        onChange={handleRatingInputChange}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        rows={1}
                        placeholder="Briefly describe your experience..."
                        disabled={ratingSubmitting}
                      />
                    </div>
                  </div>
                  <div className="self-end">
                    <button 
                      type="submit"
                      disabled={ratingSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-sm text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Ratings List */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
                  History
                  {ratings.length > 0 && (
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{ratings.length} reviews</span>
                  )}
                </h4>

                {ratingsError && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-lg text-sm text-rose-700">
                    {ratingsError}
                  </div>
                )}

                {ratingsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse flex flex-col gap-2">
                        <div className="flex justify-between">
                          <div className="h-5 bg-slate-200 rounded w-16"></div>
                          <div className="h-4 bg-slate-100 rounded w-24"></div>
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-full mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ratings.length === 0 ? (
                      <div className="text-slate-500 text-center py-10 bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                        <Star className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        No ratings have been submitted yet.
                      </div>
                    ) : (
                      ratings.map(r => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-4 items-start">
                          <div className="flex flex-col items-center justify-center bg-amber-50 text-amber-700 min-w-[3.5rem] py-2 rounded-lg border border-amber-100">
                            <span className="text-lg font-bold leading-none">{r.rating.toFixed(1)}</span>
                            <div className="flex items-center mt-1 text-[10px] uppercase font-semibold">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 mr-0.5" />
                              out of 5
                            </div>
                          </div>
                          <div className="flex-grow pt-0.5">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                {new Date(r.ratedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            {r.comment ? (
                              <p className="text-sm text-slate-700 leading-relaxed mt-2">{r.comment}</p>
                            ) : (
                              <p className="text-sm text-slate-400 italic mt-2">No comment provided.</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

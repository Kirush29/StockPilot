import { useEffect, useState } from 'react';
import { type Supplier, type SupplierRating, supplierService, type SaveSupplierRequest, type CreateSupplierRatingRequest } from '../services/supplierService';

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
        // Keep existing values or default for new
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
      // Only refetch all if we were not searching, otherwise maybe just fetch all and clear search
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
      // Reset search and reload all
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
      
      // Optionally refresh the main supplier list to reflect any new average rating
      const updatedList = await supplierService.getAllSuppliers();
      setSuppliers(updatedList);
      
    } catch (err: any) {
      setRatingFormError(err.message || 'Failed to add rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Suppliers</h2>
        <button 
          onClick={openAddForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors"
        >
          Add Supplier
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search suppliers by name or code..."
            className="flex-grow border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isSearching || loading}
          />
          <button
            type="submit"
            disabled={!searchKeyword.trim() || isSearching || loading}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 min-w-[80px]"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {hasSearched && (
            <button
              type="button"
              onClick={handleSearchClear}
              disabled={isSearching || loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {formError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              
              <form id="supplier-form" onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                  <input 
                    type="text" 
                    name="supplierCode"
                    value={formData.supplierCode}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. SUP-001"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Supplier Company Name"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input 
                    type="email" 
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="contact@supplier.com"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input 
                    type="text" 
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="+1 (555) 000-0000"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Full Business Address"
                    disabled={isSubmitting}
                  />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 mt-auto">
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="supplier-form"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              >
                {isSubmitting ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivatingSupplier && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Deactivate Supplier</h3>
            </div>
            
            <div className="p-4">
              {deactivateError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                  {deactivateError}
                </div>
              )}
              <p className="text-gray-600 text-sm">
                Are you sure you want to deactivate <strong>{deactivatingSupplier.name} ({deactivatingSupplier.supplierCode})</strong>? 
                This action will mark the supplier as inactive but will not permanently delete their data.
              </p>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 mt-auto">
              <button 
                type="button"
                onClick={() => setDeactivatingSupplier(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeactivateSubmit}
                disabled={isDeactivating}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ratingsOpenSupplier && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                Ratings: {ratingsOpenSupplier.name}
              </h3>
              <button 
                onClick={() => setRatingsOpenSupplier(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow bg-gray-50">
              <div className="bg-white p-4 border rounded-lg shadow-sm mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-4">Add a Rating</h4>
                {ratingFormError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                    {ratingFormError}
                  </div>
                )}
                <form onSubmit={handleRatingSubmit} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1-5)</label>
                    <input 
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      name="rating"
                      value={ratingFormData.rating}
                      onChange={handleRatingInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none max-w-[100px]"
                      placeholder="e.g. 4.5"
                      disabled={ratingSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Comment (Optional)</label>
                    <textarea 
                      name="comment"
                      value={ratingFormData.comment}
                      onChange={handleRatingInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      rows={2}
                      placeholder="Share your experience..."
                      disabled={ratingSubmitting}
                    />
                  </div>
                  <div className="self-end">
                    <button 
                      type="submit"
                      disabled={ratingSubmitting}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                </form>
              </div>

              <h4 className="text-sm font-bold text-gray-800 mb-4">Recent Ratings</h4>

              {ratingsError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                  {ratingsError}
                </div>
              )}

              {ratingsLoading ? (
                <div className="text-gray-500 py-8 text-center animate-pulse text-sm">
                  Loading ratings...
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.length === 0 ? (
                    <div className="text-gray-500 text-center py-6 bg-white border rounded shadow-sm text-sm">
                      No ratings yet.
                    </div>
                  ) : (
                    ratings.map(r => (
                      <div key={r.id} className="bg-white border rounded p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                            {r.rating.toFixed(1)} / 5.0
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(r.ratedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-gray-700">{r.comment}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(loading || isSearching) && (
        <div className="text-gray-500 py-8 text-center animate-pulse">
          {isSearching ? 'Searching suppliers...' : 'Loading suppliers...'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!(loading || isSearching) && !error && suppliers.length === 0 && (
        <div className="text-gray-500 text-center py-12 bg-white border rounded-lg shadow-sm">
          {hasSearched ? `No suppliers found matching "${searchKeyword}".` : 'No suppliers found.'}
        </div>
      )}

      {!(loading || isSearching) && !error && suppliers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs tracking-wider">
                  <th className="p-4 font-semibold">Code</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Contact</th>
                  <th className="p-4 font-semibold">Rating</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {supplier.supplierCode}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {supplier.name}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{supplier.contactEmail}</div>
                      <div className="text-xs text-gray-500">{supplier.contactPhone}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-full text-xs font-semibold">
                        {supplier.rating.toFixed(1)} / 5.0
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex flex-col gap-1 items-start">
                        {supplier.isActive ? (
                          <span className="bg-green-100 text-green-800 py-0.5 px-2 rounded text-xs font-medium">Active</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 py-0.5 px-2 rounded text-xs font-medium">Inactive</span>
                        )}
                        {supplier.isBlocked && (
                          <span className="bg-red-100 text-red-800 py-0.5 px-2 rounded text-xs font-medium">Blocked</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => openRatings(supplier)}
                          className="text-purple-600 hover:text-purple-800 font-medium transition-colors text-xs border border-purple-200 hover:border-purple-400 rounded px-3 py-1 bg-purple-50 hover:bg-purple-100"
                        >
                          Ratings
                        </button>
                        <button
                          onClick={() => openEditForm(supplier)}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-xs border border-blue-200 hover:border-blue-400 rounded px-3 py-1 bg-blue-50 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        {supplier.isActive && (
                          <button
                            onClick={() => openDeactivateConfirm(supplier)}
                            className="text-red-600 hover:text-red-800 font-medium transition-colors text-xs border border-red-200 hover:border-red-400 rounded px-3 py-1 bg-red-50 hover:bg-red-100"
                          >
                            Deactivate
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { type Quotation, type QuotationStatus, quotationService, type SaveQuotationRequest } from '../services/quotationService';

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    productId: '',
    unitPrice: '',
    quantity: '',
    deliveryDays: '',
    validUntil: ''
  });

  // Status update states
  const [actionQuotation, setActionQuotation] = useState<{ quotation: Quotation; action: QuotationStatus } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState<string | null>(null);

  // Comparison states
  const [compareProductId, setCompareProductId] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quotationService.getAllQuotations();
      setQuotations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations.');
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
        const data = await quotationService.getAllQuotations();
        if (isMounted) setQuotations(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load quotations.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productId = compareProductId.trim();
    if (!productId) return;

    try {
      setIsComparing(true);
      setError(null);
      const data = await quotationService.compareQuotations(productId);
      setQuotations(data);
      setHasCompared(true);
    } catch (err: any) {
      setError(err.message || 'Failed to compare quotations.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleCompareClear = async () => {
    setCompareProductId('');
    setHasCompared(false);
    await fetchQuotations();
  };

  const openAddForm = () => {
    setFormData({
      supplierId: '',
      productId: '',
      unitPrice: '',
      quantity: '',
      deliveryDays: '',
      validUntil: ''
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.supplierId.trim()) return 'Supplier ID is required.';
    if (!formData.productId.trim()) return 'Product ID is required.';
    
    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) return 'Unit Price must be greater than 0.';
    
    const quantity = parseInt(formData.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) return 'Quantity must be greater than 0.';
    
    const deliveryDays = parseInt(formData.deliveryDays, 10);
    if (isNaN(deliveryDays) || deliveryDays < 0) return 'Delivery Days must be 0 or greater.';
    
    if (!formData.validUntil.trim()) return 'Valid Until date is required.';
    
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
      const payload: SaveQuotationRequest = {
        supplierId: formData.supplierId.trim(),
        productId: formData.productId.trim(),
        unitPrice: parseFloat(formData.unitPrice),
        quantity: parseInt(formData.quantity, 10),
        deliveryDays: parseInt(formData.deliveryDays, 10),
        validUntil: new Date(formData.validUntil).toISOString()
      };

      await quotationService.createQuotation(payload);
      
      setIsFormOpen(false);
      await fetchQuotations();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStatusConfirm = (quotation: Quotation, action: QuotationStatus) => {
    setUpdateStatusError(null);
    setActionQuotation({ quotation, action });
  };

  const handleStatusSubmit = async () => {
    if (!actionQuotation) return;
    setUpdateStatusError(null);
    setIsUpdatingStatus(true);
    
    try {
      await quotationService.updateQuotationStatus(actionQuotation.quotation.id, actionQuotation.action);
      setActionQuotation(null);
      await fetchQuotations();
    } catch (err: any) {
      setUpdateStatusError(err.message || 'Failed to update quotation status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs font-semibold">Accepted</span>;
      case 'Rejected':
        return <span className="bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs font-semibold">Rejected</span>;
      case 'Pending':
      default:
        return <span className="bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full text-xs font-semibold">Pending</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quotations</h2>
        <button 
          onClick={openAddForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors"
        >
          Add Quotation
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <form onSubmit={handleCompareSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={compareProductId}
            onChange={(e) => setCompareProductId(e.target.value)}
            placeholder="Compare quotations by Product ID..."
            className="flex-grow border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isComparing || loading}
          />
          <button
            type="submit"
            disabled={!compareProductId.trim() || isComparing || loading}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 min-w-[100px]"
          >
            {isComparing ? 'Comparing...' : 'Compare'}
          </button>
          {hasCompared && (
            <button
              type="button"
              onClick={handleCompareClear}
              disabled={isComparing || loading}
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
              <h3 className="text-lg font-bold text-gray-800">Add New Quotation</h3>
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
              
              <form id="quotation-form" onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier ID</label>
                  <input 
                    type="text" 
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Supplier ID"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input 
                    type="text" 
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Product ID"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input 
                      type="number"
                      min="1"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                    <input 
                      type="number"
                      min="0"
                      name="deliveryDays"
                      value={formData.deliveryDays}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <input 
                      type="date" 
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                      disabled={isSubmitting}
                    />
                  </div>
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
                form="quotation-form"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              >
                {isSubmitting ? 'Saving...' : 'Save Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionQuotation && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {actionQuotation.action === 'Accepted' ? 'Accept Quotation' : 'Reject Quotation'}
              </h3>
            </div>
            
            <div className="p-4">
              {updateStatusError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                  {updateStatusError}
                </div>
              )}
              <p className="text-gray-600 text-sm">
                Are you sure you want to <strong>{actionQuotation.action === 'Accepted' ? 'accept' : 'reject'}</strong> the quotation for Product ID <strong>{actionQuotation.quotation.productId}</strong> from Supplier ID <strong>{actionQuotation.quotation.supplierId}</strong>?
              </p>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 mt-auto">
              <button 
                type="button"
                onClick={() => setActionQuotation(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                disabled={isUpdatingStatus}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleStatusSubmit}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px] ${
                  actionQuotation.action === 'Accepted' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isUpdatingStatus ? 'Processing...' : actionQuotation.action === 'Accepted' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(loading || isComparing) && (
        <div className="text-gray-500 py-8 text-center animate-pulse">
          {isComparing ? 'Comparing quotations...' : 'Loading quotations...'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!(loading || isComparing) && !error && quotations.length === 0 && (
        <div className="text-gray-500 text-center py-12 bg-white border rounded-lg shadow-sm">
          {hasCompared ? 'No quotations found for this product.' : 'No quotations found.'}
        </div>
      )}

      {!(loading || isComparing) && !error && quotations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs tracking-wider">
                  <th className="p-4 font-semibold">Supplier ID</th>
                  <th className="p-4 font-semibold">Product ID</th>
                  <th className="p-4 font-semibold text-right">Unit Price</th>
                  <th className="p-4 font-semibold text-right">Quantity</th>
                  <th className="p-4 font-semibold text-right">Delivery Days</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Valid Until</th>
                  <th className="p-4 font-semibold">Submitted At</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-900 truncate max-w-[150px]" title={quotation.supplierId}>
                      {quotation.supplierId}
                    </td>
                    <td className="p-4 text-sm text-gray-700 truncate max-w-[150px]" title={quotation.productId}>
                      {quotation.productId}
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium text-right">
                      ${quotation.unitPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-sm text-gray-700 text-right">
                      {quotation.quantity}
                    </td>
                    <td className="p-4 text-sm text-gray-700 text-right">
                      {quotation.deliveryDays}
                    </td>
                    <td className="p-4 text-sm">
                      {getStatusBadge(quotation.status)}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(quotation.validUntil).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(quotation.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-right">
                      {quotation.status === 'Pending' ? (
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => openStatusConfirm(quotation, 'Accepted')}
                            className="text-green-600 hover:text-green-800 font-medium transition-colors text-xs border border-green-200 hover:border-green-400 rounded px-3 py-1 bg-green-50 hover:bg-green-100"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => openStatusConfirm(quotation, 'Rejected')}
                            className="text-red-600 hover:text-red-800 font-medium transition-colors text-xs border border-red-200 hover:border-red-400 rounded px-3 py-1 bg-red-50 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">-</span>
                      )}
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

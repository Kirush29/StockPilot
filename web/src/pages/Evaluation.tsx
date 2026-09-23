import React, { useState } from 'react';
import { supplierEvaluationService, type SupplierEvaluationResponseDto, type SupplierEvaluationCandidateDto } from '../services/supplierEvaluationService';
import { quotationService, type QuotationStatus } from '../services/quotationService';

export default function Evaluation() {
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SupplierEvaluationResponseDto | null>(null);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  const [actionCandidate, setActionCandidate] = useState<{ candidate: SupplierEvaluationCandidateDto; action: QuotationStatus } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState<string | null>(null);

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = productId.trim();
    if (!pid) return;

    try {
      setLoading(true);
      setError(null);
      setEvaluation(null);
      setHasEvaluated(true);
      const data = await supplierEvaluationService.evaluateSupplier(pid);
      setEvaluation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate supplier for this product.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!actionCandidate) return;

    try {
      setIsUpdatingStatus(true);
      setUpdateStatusError(null);
      await quotationService.updateQuotationStatus(actionCandidate.candidate.quotationId, actionCandidate.action);
      
      // Update local evaluation state to show the new status in "All Evaluations"
      if (evaluation) {
        const updatedEvaluations = evaluation.allEvaluations.map(e => 
          e.quotationId === actionCandidate.candidate.quotationId 
            ? { ...e, status: actionCandidate.action } 
            : e
        );
        setEvaluation({ ...evaluation, allEvaluations: updatedEvaluations });
      }
      
      setActionCandidate(null);
    } catch (err: any) {
      setUpdateStatusError(err.message || 'Failed to update quotation status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '-';
    return Number(num).toFixed(2);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Supplier Evaluation</h2>
          <p className="text-gray-600 mt-1">Run AI evaluations and analyze procurement proposals.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <form onSubmit={handleEvaluateSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter Product ID to evaluate..."
            className="flex-grow border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!productId.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 min-w-[150px]"
          >
            {loading ? 'Evaluating...' : 'Evaluate Supplier'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-gray-500 py-8 text-center animate-pulse">
          Running evaluation workflow...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && hasEvaluated && !evaluation && (
        <div className="text-gray-500 text-center py-12 bg-white border rounded-lg shadow-sm">
          No evaluation data found for this product.
        </div>
      )}

      {!loading && !error && evaluation && (
        <div className="space-y-6">
          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Evaluation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-500 font-medium mb-1">Decision Status</p>
                <p className="text-lg font-bold text-gray-900">{evaluation.decisionStatus}</p>
              </div>
              <div className={`p-4 rounded-lg border ${evaluation.humanApprovalRequired ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <p className="text-sm font-medium mb-1 opacity-75">Human Approval Required</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {evaluation.humanApprovalRequired ? (
                    <>
                      <span className="text-amber-600">Yes - Action Needed</span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-600">No - Auto-Approved</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Eligible Candidates Section */}
          {evaluation.eligibleCandidates && evaluation.eligibleCandidates.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Eligible Candidates</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="p-4 border-b font-medium">Supplier ID</th>
                      <th className="p-4 border-b font-medium">Quotation ID</th>
                      <th className="p-4 border-b font-medium">Unit Price</th>
                      <th className="p-4 border-b font-medium">Del. Days</th>
                      <th className="p-4 border-b font-medium">Rating</th>
                      <th className="p-4 border-b font-medium text-right bg-blue-50">Price Sc.</th>
                      <th className="p-4 border-b font-medium text-right bg-blue-50">Del. Sc.</th>
                      <th className="p-4 border-b font-medium text-right bg-blue-50">Rating Sc.</th>
                      <th className="p-4 border-b font-bold text-right bg-blue-100">Overall</th>
                      {evaluation.humanApprovalRequired && (
                        <th className="p-4 border-b font-medium text-center bg-gray-50">Actions (Human Decision)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {evaluation.eligibleCandidates.map((candidate) => (
                      <tr key={candidate.quotationId} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4"><span className="font-mono text-xs text-gray-500" title={candidate.supplierId}>{candidate.supplierId.substring(0, 8)}...</span></td>
                        <td className="p-4"><span className="font-mono text-xs text-gray-500" title={candidate.quotationId}>{candidate.quotationId.substring(0, 8)}...</span></td>
                        <td className="p-4">${formatNumber(candidate.unitPrice)}</td>
                        <td className="p-4">{candidate.deliveryDays}</td>
                        <td className="p-4">{formatNumber(candidate.supplierRating)}</td>
                        <td className="p-4 text-right bg-blue-50/30">{formatNumber(candidate.priceScore)}</td>
                        <td className="p-4 text-right bg-blue-50/30">{formatNumber(candidate.deliveryScore)}</td>
                        <td className="p-4 text-right bg-blue-50/30">{formatNumber(candidate.ratingScore)}</td>
                        <td className="p-4 text-right bg-blue-100/50 font-bold text-blue-900">{formatNumber(candidate.overallScore)}</td>
                        {evaluation.humanApprovalRequired && (
                          <td className="p-4 bg-gray-50/50 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setActionCandidate({ candidate, action: 'Accepted' })}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setActionCandidate({ candidate, action: 'Rejected' })}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Evaluations Section */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">All Evaluations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-4 border-b font-medium">Supplier ID</th>
                    <th className="p-4 border-b font-medium">Quotation ID</th>
                    <th className="p-4 border-b font-medium">Unit Price</th>
                    <th className="p-4 border-b font-medium">Del. Days</th>
                    <th className="p-4 border-b font-medium">Rating</th>
                    <th className="p-4 border-b font-medium">Status</th>
                    <th className="p-4 border-b font-medium">Eligible</th>
                    <th className="p-4 border-b font-medium max-w-xs">Reason</th>
                    <th className="p-4 border-b font-medium text-right">Price Sc.</th>
                    <th className="p-4 border-b font-medium text-right">Del. Sc.</th>
                    <th className="p-4 border-b font-medium text-right">Rating Sc.</th>
                    <th className="p-4 border-b font-bold text-right">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {evaluation.allEvaluations.map((evalRow) => (
                    <tr key={evalRow.quotationId} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4"><span className="font-mono text-xs text-gray-500" title={evalRow.supplierId}>{evalRow.supplierId.substring(0, 8)}...</span></td>
                      <td className="p-4"><span className="font-mono text-xs text-gray-500" title={evalRow.quotationId}>{evalRow.quotationId.substring(0, 8)}...</span></td>
                      <td className="p-4">${formatNumber(evalRow.unitPrice)}</td>
                      <td className="p-4">{evalRow.deliveryDays}</td>
                      <td className="p-4">{formatNumber(evalRow.supplierRating)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          evalRow.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                          evalRow.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {evalRow.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          evalRow.eligibility ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {evalRow.eligibility ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 max-w-xs truncate" title={evalRow.eligibilityReason}>
                        {evalRow.eligibilityReason}
                      </td>
                      <td className="p-4 text-right">{formatNumber(evalRow.priceScore)}</td>
                      <td className="p-4 text-right">{formatNumber(evalRow.deliveryScore)}</td>
                      <td className="p-4 text-right">{formatNumber(evalRow.ratingScore)}</td>
                      <td className="p-4 text-right font-medium">{formatNumber(evalRow.overallScore)}</td>
                    </tr>
                  ))}
                  {evaluation.allEvaluations.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-gray-500">
                        No evaluations returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {actionCandidate && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Confirm Human Decision
              </h3>
            </div>
            
            <div className="p-6">
              {updateStatusError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                  {updateStatusError}
                </div>
              )}
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to <strong>{actionCandidate.action === 'Accepted' ? 'Approve' : 'Reject'}</strong> the candidate quotation?
              </p>
              
              <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700 mb-6 font-mono">
                <div><span className="font-semibold">Supplier ID:</span> {actionCandidate.candidate.supplierId}</div>
                <div className="mt-1"><span className="font-semibold">Quotation ID:</span> {actionCandidate.candidate.quotationId}</div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionCandidate(null)}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusSubmit}
                  disabled={isUpdatingStatus}
                  className={`px-4 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                    actionCandidate.action === 'Accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isUpdatingStatus ? 'Processing...' : `Confirm ${actionCandidate.action === 'Accepted' ? 'Approve' : 'Reject'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

def select_candidate(candidates):
    if not candidates:
        return None
    
    def sort_key(c):
        return (
            -c.get("overallScore", 0),
            c.get("unitPrice", float('inf')),
            c.get("deliveryDays", float('inf')),
            -c.get("supplierRating", 0) if c.get("supplierRating") is not None else 0,
            c.get("quotationId", "")
        )
    
    return sorted(candidates, key=sort_key)[0]

def decide_supplier(product_id, candidates):
    selected = select_candidate(candidates)
    
    if not selected:
        return {
            "decisionStatus": "NoEligibleSupplier",
            "selectedSupplierId": None,
            "selectedQuotationId": None,
            "reasonSummary": "No eligible candidates were provided for evaluation.",
            "humanApprovalRequired": True
        }
    
    return {
        "decisionStatus": "PendingHumanApproval",
        "selectedSupplierId": selected.get("supplierId"),
        "selectedQuotationId": selected.get("quotationId"),
        "reasonSummary": f"Selected quotation {selected.get('quotationId')} from supplier {selected.get('supplierId')} based on highest overall score of {selected.get('overallScore')}.",
        "humanApprovalRequired": True
    }

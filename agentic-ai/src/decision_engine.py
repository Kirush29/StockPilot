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

import json
import os
from .llm_provider import get_openai_client

def decide_supplier_ai(product_id, candidates):
    if not candidates:
        return {
            "decisionStatus": "NoEligibleSupplier",
            "selectedSupplierId": None,
            "selectedQuotationId": None,
            "reasonSummary": "No eligible candidates were provided for evaluation.",
            "humanApprovalRequired": True
        }
        
    client = get_openai_client()
    
    schema_path = os.path.join(os.path.dirname(__file__), '../contracts/supplier-evaluation-output.schema.json')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)
        
    # OpenAI strict schema constraints
    if "$schema" in schema:
        del schema["$schema"]
    if "required" not in schema:
        schema["required"] = []
    for prop in schema.get("properties", {}):
        if prop not in schema["required"]:
            schema["required"].append(prop)
    schema["additionalProperties"] = False
    
    for prop, details in schema.get("properties", {}).items():
        if "const" in details:
            details["type"] = "boolean"
            del details["const"]

    messages = [
        {
            "role": "system", 
            "content": "You are a supplier evaluation agent. Choose the best supplier quotation deterministically based on overallScore, unitPrice, and deliveryDays. Output JSON."
        },
        {
            "role": "user", 
            "content": f"Product ID: {product_id}\nCandidates: {json.dumps(candidates)}"
        }
    ]
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.0,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "SupplierEvaluationOutput",
                "schema": schema,
                "strict": True
            }
        }
    )
    
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from OpenAI.")
        
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        raise ValueError("Malformed JSON response from OpenAI.")
        
    required_keys = ["decisionStatus", "reasonSummary", "humanApprovalRequired"]
    for key in required_keys:
        if key not in parsed:
            raise ValueError(f"Missing required field in output: {key}")
            
    # Enforce boundaries
    parsed["humanApprovalRequired"] = True
    
    if not parsed.get("decisionStatus"):
        raise ValueError("Missing decisionStatus.")
        
    return parsed

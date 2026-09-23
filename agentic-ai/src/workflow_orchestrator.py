from .decision_engine import decide_supplier

def validate_input(data):
    if not isinstance(data, dict):
        raise ValueError("Input must be a dictionary.")
    
    product_id = data.get("productId")
    if not product_id or not isinstance(product_id, str):
        raise ValueError("Invalid or missing 'productId'.")
        
    candidates = data.get("candidates")
    if not isinstance(candidates, list):
        raise ValueError("Invalid or missing 'candidates'. Must be a list.")
        
    required_fields = [
        "supplierId", "quotationId", "unitPrice", "deliveryDays", 
        "priceScore", "deliveryScore", "ratingScore", "overallScore"
    ]
    
    for i, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            raise ValueError(f"Candidate at index {i} must be a dictionary.")
            
        for field in required_fields:
            if field not in candidate:
                raise ValueError(f"Candidate at index {i} is missing required field '{field}'.")
                
        # Basic numeric type checks
        if not isinstance(candidate["unitPrice"], (int, float)):
            raise ValueError(f"Candidate at index {i} has invalid 'unitPrice'.")
        if not isinstance(candidate["deliveryDays"], int):
            raise ValueError(f"Candidate at index {i} has invalid 'deliveryDays'.")
        if not isinstance(candidate["overallScore"], (int, float)):
            raise ValueError(f"Candidate at index {i} has invalid 'overallScore'.")

def execute_workflow(input_data):
    # Step 1: Validate input
    validate_input(input_data)
    
    # Step 2: Extract eligible candidates
    candidates = input_data["candidates"]
    product_id = input_data["productId"]
    
    # Step 3: Invoke the deterministic decision engine
    decision_output = decide_supplier(product_id, candidates)
    
    # Step 4: Return the output contract
    return decision_output

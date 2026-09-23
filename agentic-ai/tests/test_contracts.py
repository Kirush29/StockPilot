import json
import sys
import os

def test_json_validity(filepath):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        print(f"OK: {os.path.basename(filepath)} is valid JSON.")
        
        if "humanApprovalRequired" in data.get("properties", {}):
            prop = data["properties"]["humanApprovalRequired"]
            assert prop.get("const") is True, "humanApprovalRequired must be const True"
            print(f"OK: {os.path.basename(filepath)} enforces humanApprovalRequired=true")
            
        return True
    except Exception as e:
        print(f"FAIL: {os.path.basename(filepath)} failed with error: {e}")
        return False

def main():
    contracts_dir = os.path.join(os.path.dirname(__file__), "..", "contracts")
    schemas = [
        "supplier-evaluation-input.schema.json",
        "supplier-evaluation-output.schema.json"
    ]
    
    all_passed = True
    for schema in schemas:
        if not test_json_validity(os.path.join(contracts_dir, schema)):
            all_passed = False
            
    if all_passed:
        print("All contract tests passed.")
        sys.exit(0)
    else:
        print("Some contract tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()

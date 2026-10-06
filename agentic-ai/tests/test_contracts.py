import json
import sys
import os
import pytest

def check_json_validity(filepath):
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

contracts_dir = os.path.join(os.path.dirname(__file__), "..", "contracts")
procurement_dir = os.path.join(contracts_dir, "procurement-coordinator")
schemas = [
    os.path.join(contracts_dir, "supplier-evaluation-input.schema.json"),
    os.path.join(contracts_dir, "supplier-evaluation-output.schema.json")
] + sorted(os.path.join(procurement_dir, f) for f in os.listdir(procurement_dir) if f.endswith(".schema.json"))

@pytest.mark.parametrize("filepath", schemas)
def test_json_validity(filepath):
    assert check_json_validity(filepath) is True

def test_procurement_output_requires_human_approval():
    with open(os.path.join(procurement_dir, "workflow-output.schema.json")) as f:
        schema = json.load(f)
    assert "humanApprovalRequired" in schema["required"]
    assert schema["properties"]["humanApprovalRequired"]["const"] is True

def test_create_proposal_output_pins_pending_approval():
    with open(os.path.join(procurement_dir, "create-proposal.output.schema.json")) as f:
        schema = json.load(f)
    assert schema["properties"]["status"] == {"const": "PendingApproval"}

def main():
    contracts_dir = os.path.join(os.path.dirname(__file__), "..", "contracts")
    schemas = [
        "supplier-evaluation-input.schema.json",
        "supplier-evaluation-output.schema.json"
    ]
    
    all_passed = True
    for schema in schemas:
        if not check_json_validity(os.path.join(contracts_dir, schema)):
            all_passed = False
            
    if all_passed:
        print("All contract tests passed.")
        sys.exit(0)
    else:
        print("Some contract tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()

import sys
import json
from src.workflow_orchestrator import execute_workflow

def main():
    try:
        # Read raw input from stdin
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            raise ValueError("Empty input received on stdin.")
            
        # Parse JSON
        input_data = json.loads(raw_input)
        
        # Extract mode if present, default to deterministic
        mode = input_data.pop("mode", "deterministic")
        
        # Execute workflow
        output = execute_workflow(input_data, mode=mode)
        
        # Print valid JSON to stdout
        sys.stdout.write(json.dumps(output))
        sys.stdout.flush()
        
    except json.JSONDecodeError as e:
        sys.stderr.write(f"JSON Parsing Error: {str(e)}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Workflow Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()

import unittest
from unittest.mock import patch
import sys
import io
import json

import src.__main__ as cli_main

class TestMainCLI(unittest.TestCase):
    @patch('sys.stdin', new_callable=io.StringIO)
    @patch('sys.stdout', new_callable=io.StringIO)
    @patch('sys.stderr', new_callable=io.StringIO)
    @patch('src.__main__.execute_workflow')
    def test_successful_execution(self, mock_execute, mock_stderr, mock_stdout, mock_stdin):
        # Setup
        mock_execute.return_value = {"decisionStatus": "PendingHumanApproval"}
        input_json = json.dumps({
            "mode": "deterministic",
            "productId": "p1",
            "candidates": []
        })
        mock_stdin.write(input_json)
        mock_stdin.seek(0)
        
        # Execute
        cli_main.main()
        
        # Verify
        mock_execute.assert_called_once_with({"productId": "p1", "candidates": []}, mode="deterministic")
        self.assertEqual(mock_stdout.getvalue(), '{"decisionStatus": "PendingHumanApproval"}')
        self.assertEqual(mock_stderr.getvalue(), "")

    @patch('sys.stdin', new_callable=io.StringIO)
    @patch('sys.stdout', new_callable=io.StringIO)
    @patch('sys.stderr', new_callable=io.StringIO)
    def test_json_decode_error(self, mock_stderr, mock_stdout, mock_stdin):
        mock_stdin.write("not valid json")
        mock_stdin.seek(0)
        
        with self.assertRaises(SystemExit) as cm:
            cli_main.main()
            
        self.assertEqual(cm.exception.code, 1)
        self.assertIn("JSON Parsing Error", mock_stderr.getvalue())
        self.assertEqual(mock_stdout.getvalue(), "")

    @patch('sys.stdin', new_callable=io.StringIO)
    @patch('sys.stdout', new_callable=io.StringIO)
    @patch('sys.stderr', new_callable=io.StringIO)
    @patch('src.__main__.execute_workflow')
    def test_workflow_error(self, mock_execute, mock_stderr, mock_stdout, mock_stdin):
        mock_execute.side_effect = ValueError("Missing product ID")
        mock_stdin.write('{"candidates": []}')
        mock_stdin.seek(0)
        
        with self.assertRaises(SystemExit) as cm:
            cli_main.main()
            
        self.assertEqual(cm.exception.code, 1)
        self.assertIn("Workflow Error: Missing product ID", mock_stderr.getvalue())
        self.assertEqual(mock_stdout.getvalue(), "")

if __name__ == "__main__":
    unittest.main()

import unittest
from unittest.mock import patch, MagicMock

from src.workflow_orchestrator import execute_workflow

class TestWorkflowOrchestrator(unittest.TestCase):

    def setUp(self):
        self.valid_candidate = {
            "supplierId": "s1",
            "quotationId": "q1",
            "unitPrice": 10.0,
            "deliveryDays": 5,
            "supplierRating": 4.5,
            "priceScore": 100.0,
            "deliveryScore": 100.0,
            "ratingScore": 100.0,
            "overallScore": 100.0
        }

    def test_workflow_multiple_candidates(self):
        c2 = self.valid_candidate.copy()
        c2["supplierId"] = "s2"
        c2["quotationId"] = "q2"
        c2["overallScore"] = 90.0
        
        input_data = {
            "productId": "p1",
            "candidates": [self.valid_candidate, c2]
        }
        
        output = execute_workflow(input_data)
        
        self.assertEqual(output["decisionStatus"], "PendingHumanApproval")
        self.assertEqual(output["selectedSupplierId"], "s1")
        self.assertEqual(output["selectedQuotationId"], "q1")
        self.assertTrue(output["humanApprovalRequired"])
        self.assertIn("reasonSummary", output)

    def test_workflow_no_candidates(self):
        input_data = {
            "productId": "p1",
            "candidates": []
        }
        
        output = execute_workflow(input_data)
        
        self.assertEqual(output["decisionStatus"], "NoEligibleSupplier")
        self.assertIsNone(output["selectedSupplierId"])
        self.assertIsNone(output["selectedQuotationId"])
        self.assertTrue(output["humanApprovalRequired"])

    def test_invalid_product_id(self):
        input_data = {
            "candidates": [self.valid_candidate]
        }
        with self.assertRaises(ValueError):
            execute_workflow(input_data)

    def test_invalid_candidates_structure(self):
        input_data = {
            "productId": "p1",
            "candidates": "not a list"
        }
        with self.assertRaises(ValueError):
            execute_workflow(input_data)

    def test_malformed_candidate_data(self):
        malformed_candidate = self.valid_candidate.copy()
        del malformed_candidate["overallScore"]
        
        input_data = {
            "productId": "p1",
            "candidates": [malformed_candidate]
        }
        with self.assertRaises(ValueError):
            execute_workflow(input_data)
            
    @patch('src.workflow_orchestrator.decide_supplier')
    @patch('src.workflow_orchestrator.decide_supplier_ai')
    def test_default_mode_calls_deterministic(self, mock_ai, mock_det):
        mock_det.return_value = {"decisionStatus": "PendingHumanApproval"}
        input_data = {"productId": "p1", "candidates": [self.valid_candidate]}
        
        output = execute_workflow(input_data)
        
        mock_det.assert_called_once_with("p1", [self.valid_candidate])
        mock_ai.assert_not_called()
        self.assertTrue(output["humanApprovalRequired"])

    @patch('src.workflow_orchestrator.decide_supplier')
    @patch('src.workflow_orchestrator.decide_supplier_ai')
    def test_explicit_deterministic_mode(self, mock_ai, mock_det):
        mock_det.return_value = {"decisionStatus": "PendingHumanApproval"}
        input_data = {"productId": "p1", "candidates": [self.valid_candidate]}
        
        output = execute_workflow(input_data, mode="deterministic")
        
        mock_det.assert_called_once_with("p1", [self.valid_candidate])
        mock_ai.assert_not_called()
        self.assertTrue(output["humanApprovalRequired"])

    @patch('src.workflow_orchestrator.decide_supplier')
    @patch('src.workflow_orchestrator.decide_supplier_ai')
    def test_ai_mode_calls_ai(self, mock_ai, mock_det):
        mock_ai.return_value = {"decisionStatus": "PendingHumanApproval"}
        input_data = {"productId": "p1", "candidates": [self.valid_candidate]}
        
        output = execute_workflow(input_data, mode="ai")
        
        mock_ai.assert_called_once_with("p1", [self.valid_candidate])
        mock_det.assert_not_called()
        self.assertTrue(output["humanApprovalRequired"])

    def test_invalid_mode_rejected(self):
        input_data = {"productId": "p1", "candidates": [self.valid_candidate]}
        with self.assertRaises(ValueError):
            execute_workflow(input_data, mode="magic")

if __name__ == '__main__':
    unittest.main()

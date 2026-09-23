import unittest

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

if __name__ == '__main__':
    unittest.main()

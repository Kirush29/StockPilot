import unittest

from src.decision_engine import decide_supplier

class TestDecisionEngine(unittest.TestCase):
    def test_no_candidates(self):
        result = decide_supplier("p1", [])
        self.assertEqual(result["decisionStatus"], "NoEligibleSupplier")
        self.assertIsNone(result["selectedSupplierId"])
        self.assertTrue(result["humanApprovalRequired"])
        
    def test_single_candidate(self):
        c = {"supplierId": "s1", "quotationId": "q1", "overallScore": 100}
        result = decide_supplier("p1", [c])
        self.assertEqual(result["decisionStatus"], "PendingHumanApproval")
        self.assertEqual(result["selectedSupplierId"], "s1")
        self.assertEqual(result["selectedQuotationId"], "q1")
        self.assertTrue(result["humanApprovalRequired"])

    def test_highest_overall_score(self):
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 80}
        c2 = {"supplierId": "s2", "quotationId": "q2", "overallScore": 90}
        result = decide_supplier("p1", [c1, c2])
        self.assertEqual(result["selectedSupplierId"], "s2")

    def test_unit_price_tie_break(self):
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 90, "unitPrice": 20}
        c2 = {"supplierId": "s2", "quotationId": "q2", "overallScore": 90, "unitPrice": 10}
        result = decide_supplier("p1", [c1, c2])
        self.assertEqual(result["selectedSupplierId"], "s2")

    def test_delivery_days_tie_break(self):
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 90, "unitPrice": 10, "deliveryDays": 5}
        c2 = {"supplierId": "s2", "quotationId": "q2", "overallScore": 90, "unitPrice": 10, "deliveryDays": 2}
        result = decide_supplier("p1", [c1, c2])
        self.assertEqual(result["selectedSupplierId"], "s2")

    def test_supplier_rating_tie_break(self):
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 90, "unitPrice": 10, "deliveryDays": 5, "supplierRating": 4.0}
        c2 = {"supplierId": "s2", "quotationId": "q2", "overallScore": 90, "unitPrice": 10, "deliveryDays": 5, "supplierRating": 4.5}
        result = decide_supplier("p1", [c1, c2])
        self.assertEqual(result["selectedSupplierId"], "s2")

    def test_quotation_id_tie_break(self):
        c1 = {"supplierId": "s1", "quotationId": "q2", "overallScore": 90, "unitPrice": 10, "deliveryDays": 5, "supplierRating": 4.5}
        c2 = {"supplierId": "s2", "quotationId": "q1", "overallScore": 90, "unitPrice": 10, "deliveryDays": 5, "supplierRating": 4.5}
        result = decide_supplier("p1", [c1, c2])
        self.assertEqual(result["selectedSupplierId"], "s2")
        
    def test_human_approval_always_true(self):
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 90}
        result1 = decide_supplier("p1", [c1])
        result2 = decide_supplier("p1", [])
        self.assertTrue(result1["humanApprovalRequired"])
        self.assertTrue(result2["humanApprovalRequired"])

from src.decision_engine import decide_supplier_ai
from unittest.mock import patch, MagicMock

class TestDecisionEngineAI(unittest.TestCase):
    @patch('src.decision_engine.get_openai_client')
    def test_successful_ai_decision(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"decisionStatus": "PendingHumanApproval", "selectedSupplierId": "s2", "selectedQuotationId": "q2", "reasonSummary": "Tested", "humanApprovalRequired": false}'
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        c1 = {"supplierId": "s1", "quotationId": "q1", "overallScore": 80}
        c2 = {"supplierId": "s2", "quotationId": "q2", "overallScore": 90}
        
        result = decide_supplier_ai("p1", [c1, c2])
        
        # Verify API call
        mock_client.chat.completions.create.assert_called_once()
        
        # Verify output parsing and overrides
        self.assertEqual(result["decisionStatus"], "PendingHumanApproval")
        self.assertEqual(result["selectedSupplierId"], "s2")
        self.assertEqual(result["selectedQuotationId"], "q2")
        self.assertTrue(result["humanApprovalRequired"]) # forced true
        
    @patch('src.decision_engine.get_openai_client')
    def test_malformed_json_raises_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = 'not valid json'
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        with self.assertRaises(ValueError) as context:
            decide_supplier_ai("p1", [{"supplierId": "s1"}])
        self.assertIn("Malformed JSON", str(context.exception))
        
    @patch('src.decision_engine.get_openai_client')
    def test_missing_fields_raises_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        # Missing decisionStatus
        mock_response.choices[0].message.content = '{"reasonSummary": "Tested", "humanApprovalRequired": true}'
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        with self.assertRaises(ValueError) as context:
            decide_supplier_ai("p1", [{"supplierId": "s1"}])
        self.assertIn("Missing required field", str(context.exception))

if __name__ == '__main__':
    unittest.main()

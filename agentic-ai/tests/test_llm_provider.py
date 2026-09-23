import unittest
from unittest.mock import patch
import os

from src.llm_provider import get_openai_client

class TestLLMProvider(unittest.TestCase):
    
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_api_key_handled_safely(self):
        with self.assertRaises(ValueError) as context:
            get_openai_client()
        self.assertIn("OPENAI_API_KEY", str(context.exception))

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"}, clear=True)
    @patch('src.llm_provider.OpenAI')
    def test_client_constructed_without_api_call(self, mock_openai):
        client = get_openai_client()
        
        # Verify the mock was called, meaning the provider tried to construct the client
        mock_openai.assert_called_once_with(api_key="test-key-123")
        
        # Verify no real network request or unexpected side-effect happened
        self.assertEqual(client, mock_openai.return_value)

if __name__ == '__main__':
    unittest.main()

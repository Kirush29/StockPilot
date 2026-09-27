import unittest
from unittest.mock import patch
import os

from agents.supplier_evaluation.llm_provider import (
    get_openai_client, 
    get_model_name,
    DEFAULT_GEMINI_BASE_URL,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_OPENAI_MODEL
)

class TestLLMProvider(unittest.TestCase):
    
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_api_key_handled_safely(self):
        with self.assertRaises(ValueError) as context:
            get_openai_client()
        self.assertIn("OPENAI_API_KEY", str(context.exception))

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key-123"}, clear=True)
    @patch('agents.supplier_evaluation.llm_provider.OpenAI')
    def test_client_constructed_without_api_call(self, mock_openai):
        client = get_openai_client()
        
        # Verify the mock was called, meaning the provider tried to construct the client
        mock_openai.assert_called_once_with(api_key="test-key-123")
        self.assertEqual(client, mock_openai.return_value)
        self.assertEqual(get_model_name(), DEFAULT_OPENAI_MODEL)

    @patch.dict(os.environ, {"GEMINI_API_KEY": "gemini-test-key"}, clear=True)
    @patch('agents.supplier_evaluation.llm_provider.OpenAI')
    def test_gemini_client_constructed_with_gemini_api_key(self, mock_openai):
        client = get_openai_client()
        
        mock_openai.assert_called_once_with(
            api_key="gemini-test-key",
            base_url=DEFAULT_GEMINI_BASE_URL
        )
        self.assertEqual(client, mock_openai.return_value)
        self.assertEqual(get_model_name(), DEFAULT_GEMINI_MODEL)

    @patch.dict(os.environ, {"GOOGLE_API_KEY": "google-test-key"}, clear=True)
    @patch('agents.supplier_evaluation.llm_provider.OpenAI')
    def test_gemini_client_constructed_with_google_api_key(self, mock_openai):
        client = get_openai_client()
        
        mock_openai.assert_called_once_with(
            api_key="google-test-key",
            base_url=DEFAULT_GEMINI_BASE_URL
        )
        self.assertEqual(client, mock_openai.return_value)

    @patch.dict(os.environ, {
        "AGENT_MODEL_PROVIDER": "gemini",
        "AGENT_MODEL_API_KEY": "custom-agent-key",
        "GEMINI_MODEL": "gemini-1.5-flash"
    }, clear=True)
    @patch('agents.supplier_evaluation.llm_provider.OpenAI')
    def test_gemini_custom_model_and_agent_model_api_key(self, mock_openai):
        client = get_openai_client()
        
        mock_openai.assert_called_once_with(
            api_key="custom-agent-key",
            base_url=DEFAULT_GEMINI_BASE_URL
        )
        self.assertEqual(client, mock_openai.return_value)
        self.assertEqual(get_model_name(), "gemini-1.5-flash")

if __name__ == '__main__':
    unittest.main()

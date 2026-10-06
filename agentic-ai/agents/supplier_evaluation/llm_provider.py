import os
from dotenv import load_dotenv
from openai import OpenAI

DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

load_dotenv()

def get_provider():
    provider = os.environ.get("AGENT_MODEL_PROVIDER", "").strip().lower()
    if provider:
        return provider
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return "gemini"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("AGENT_MODEL_API_KEY"):
        return "gemini"
    return None

def get_model_name():
    provider = get_provider()
    if provider == "gemini":
        return os.environ.get("GEMINI_MODEL") or os.environ.get("AGENT_MODEL_NAME") or DEFAULT_GEMINI_MODEL
    return os.environ.get("OPENAI_MODEL") or os.environ.get("AGENT_MODEL_NAME") or DEFAULT_OPENAI_MODEL

def get_openai_client():
    provider = get_provider()
    
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    generic_key = os.environ.get("AGENT_MODEL_API_KEY")

    if provider == "gemini":
        api_key = gemini_key or generic_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")
        base_url = os.environ.get("GEMINI_BASE_URL", DEFAULT_GEMINI_BASE_URL)
        return OpenAI(api_key=api_key, base_url=base_url)

    if provider == "openai" or openai_key:
        api_key = openai_key or generic_key
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set.")
        base_url = os.environ.get("OPENAI_BASE_URL")
        if base_url:
            return OpenAI(api_key=api_key, base_url=base_url)
        return OpenAI(api_key=api_key)

    raise ValueError("Neither OPENAI_API_KEY nor GEMINI_API_KEY environment variable is set.")

def get_llm_client_and_model():
    return get_openai_client(), get_model_name()

import os
from dotenv import load_dotenv
from openai import OpenAI

def get_openai_client():
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set.")
        
    return OpenAI(api_key=api_key)

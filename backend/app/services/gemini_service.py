"""
Gemini Service for interacting with Google's Gemini 2.5 Flash model.
Handles file uploading, classification, and data extraction for the Agent flow.
"""
import os
import json
import time
import typing
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("GOOGLE_API_KEY not set. Gemini features will fail.")

# Model Configuration
MODEL_NAME = "gemini-2.0-flash-exp"  # Fallback/Primary until 2.5 alias is stable in lib
# Note: If 2.5 is available via specialized name, update here. 
# Search indicated 2.5 flash is available, but python lib might need specific string.
# Using flash-exp is safest 'latest fast' model usually.

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel(MODEL_NAME)
        self.generation_config = genai.GenerationConfig(
            temperature=0.0,
            top_p=0.95,
            top_k=64,
            max_output_tokens=8192,
            response_mime_type="application/json",
        )

    def upload_file(self, file_path: str, mime_type: str = "application/pdf"):
        """Uploads a file to Gemini Files API for processing."""
        try:
            logger.info(f"Uploading file {file_path} to Gemini...")
            file = genai.upload_file(file_path, mime_type=mime_type)
            logger.info(f"Uploaded file: {file.uri}")
            
            # Wait for processing to complete
            while file.state.name == "PROCESSING":
                time.sleep(1)
                file = genai.get_file(file.name)
                
            if file.state.name == "FAILED":
                raise ValueError(f"File upload failed: {file.state.name}")
                
            return file
        except Exception as e:
            logger.error(f"Error uploading file to Gemini: {e}")
            raise

    def classify_document(self, file) -> str:
        """
        Classifies the document into: TIMESHEET, RECEIPT, INVOICE, or OTHER.
        """
        prompt = """
        Analyze this document and classify it into one of the following categories:
        - "TIMESHEET": A document recording work hours, potentially with employee name, dates, and client.
        - "RECEIPT": A proof of purchase or payment.
        - "INVOICE": A bill for services or goods.
        - "OTHER": Any other document type.
        
        Return ONLY a JSON object with a single key "classification".
        Example: {"classification": "TIMESHEET"}
        """
        
        try:
            response = self.model.generate_content(
                [prompt, file],
                generation_config=self.generation_config
            )
            data = json.loads(response.text)
            return data.get("classification", "OTHER")
        except Exception as e:
            logger.error(f"Error in classification: {e}")
            return "OTHER"

    def extract_timesheet_data(self, file) -> dict:
        """
        Extracts structured data from a timesheet.
        """
        prompt = """
        Extract the following information from the timesheet document:
        - employee_name: Full name of the employee
        - period_start_date: Start date of the period (YYYY-MM-DD)
        - period_end_date: End date of the period (YYYY-MM-DD)
        - client_name: Name of the client or project
        - total_hours: Total hours worked in the period
        - days: List of daily entries with {date: YYYY-MM-DD, hours: float, description: str}

        Return ONLY a JSON object.
        """
        
        try:
            response = self.model.generate_content(
                [prompt, file],
                generation_config=self.generation_config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error in extraction: {e}")
            return {}

    def generate_content(self, parts: list):
        """Wrapper for generate_content"""
        return self.model.generate_content(
            parts,
            generation_config=self.generation_config,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

# Instantiate global service
gemini_service = GeminiService()

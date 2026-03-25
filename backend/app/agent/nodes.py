from app.agent.state import AgentState
from app.services.gemini_service import gemini_service
from app.models import Employee, Client, Timesheet
from sqlalchemy.orm import Session
from app.database import SessionLocal
import logging

logger = logging.getLogger(__name__)

def classify_node(state: AgentState) -> AgentState:
    """
    Node to classify the document.
    """
    logger.info(f"Classifying upload {state['upload_id']}")
    try:
        classification = gemini_service.classify_document(state['gemini_file'])
        state['classification'] = classification
        state['logs'].append(f"Classified as: {classification}")
    except Exception as e:
        state['status'] = "ERROR"
        state['logs'].append(f"Classification failed: {str(e)}")
    return state

def extract_node(state: AgentState) -> AgentState:
    """
    Node to extract data from timesheet.
    """
    if state['classification'] != "TIMESHEET":
        return state

    logger.info(f"Extracting data for upload {state['upload_id']}")
    try:
        data = gemini_service.extract_timesheet_data(state['gemini_file'])
        state['extracted_data'] = data
        state['logs'].append("Data extracted successfully")
    except Exception as e:
        state['status'] = "ERROR"
        state['logs'].append(f"Extraction failed: {str(e)}")
    return state

def validate_node(state: AgentState) -> AgentState:
    """
    Node to validate extracted data against business rules.
    """
    if not state['extracted_data']:
        return state

    data = state['extracted_data']
    errors = []

    # 1. Check Mandatory Fields
    if not data.get('employee_name'):
        errors.append("Missing Employee Name")
    if not data.get('period_start_date'):
        errors.append("Missing Period Start Date")
    
    # 2. Database Checks (Employee Existence)
    db: Session = SessionLocal()
    try:
        # Simple fuzzy match or exact match logic (Mock for now)
        # In real-world, we'd search `Employee` table by name or email if extracted
        # Let's assume we validate 'client_name' exists
        pass 
    except Exception as e:
        logger.error(f"DB Validation error: {e}")
    finally:
        db.close()

    # 3. Logic Checks
    # Future dates, etc.
    
    state['validation_errors'] = errors
    if errors:
        state['status'] = "INVALID"
        state['logs'].append(f"Validation failed: {errors}")
    else:
        state['status'] = "VALID"
        state['logs'].append("Validation passed")
        
    return state

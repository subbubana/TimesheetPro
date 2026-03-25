from typing import TypedDict, List, Optional, Dict, Any

class AgentState(TypedDict):
    """
    State for the Timesheet Processing Agent.
    """
    upload_id: int
    file_path: str
    gemini_file: Any # The uploaded Gemini file object
    classification: Optional[str]
    extracted_data: Optional[Dict[str, Any]]
    validation_errors: List[str]
    status: str # "PENDING", "PROCESSING", "VALID", "INVALID", "FLAGGED", "ERROR"
    retry_count: int
    logs: List[str]

from sqlalchemy.orm import Session
from app.models import TimesheetUpload, UploadStatus, Timesheet, TimesheetDetail, TimesheetStatus, Employee, Client
from app.agent.graph import timesheet_processing_app
from app.services.gemini_service import gemini_service
from app.database import SessionLocal
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def process_pending_uploads():
    """
    Fetch pending uploads and process them through the AI Agent.
    """
    db: Session = SessionLocal()
    try:
        uploads = db.query(TimesheetUpload).filter(
            TimesheetUpload.status == UploadStatus.PENDING
        ).all()

        logger.info(f"Found {len(uploads)} pending uploads to process.")

        for upload in uploads:
            process_single_upload(db, upload)
            
    except Exception as e:
        logger.error(f"Error in process_pending_uploads: {e}")
    finally:
        db.close()

def process_single_upload(db: Session, upload: TimesheetUpload):
    """
    Process a single upload record.
    """
    try:
        # 1. Update status to PROCESSING
        upload.status = UploadStatus.PROCESSING
        db.commit()

        # 2. Upload to Gemini Files API
        # Needed for the agent to work
        # Assuming file_path is local absolute path
        try:
            gemini_file = gemini_service.upload_file(upload.file_path, mime_type="application/pdf")
        except Exception as e:
            logger.error(f"Gemini Upload Failed for {upload.id}: {e}")
            upload.status = UploadStatus.FAILED
            upload.error_message = f"Gemini Upload Failed: {str(e)}"
            db.commit()
            return

        # 3. Initialize Agent State
        initial_state = {
            "upload_id": upload.id,
            "file_path": upload.file_path,
            "gemini_file": gemini_file,
            "classification": None,
            "extracted_data": None,
            "validation_errors": [],
            "status": "PROCESSING",
            "retry_count": 0,
            "logs": []
        }

        # 4. Invoke Agent
        logger.info(f"Invoking Agent for upload {upload.id}")
        final_state = timesheet_processing_app.invoke(initial_state)

        # 5. Handle Result
        status = final_state.get("status")
        
        if status == "VALID":
            save_timesheet_to_db(db, upload, final_state["extracted_data"])
            upload.status = UploadStatus.ANALYZED
            upload.error_message = None # Clear any previous errors
            
            # Append logs to metadata
            metadata = json.loads(upload.upload_metadata or '{}')
            metadata['agent_logs'] = final_state['logs']
            upload.upload_metadata = json.dumps(metadata)
            
        else:
            upload.status = UploadStatus.FAILED
            upload.error_message = f"Agent Status: {status}. Errors: {final_state.get('validation_errors')}"
            
            # Append logs
            metadata = json.loads(upload.upload_metadata or '{}')
            metadata['agent_logs'] = final_state['logs']
            upload.upload_metadata = json.dumps(metadata)

        db.commit()
        logger.info(f"Finished processing upload {upload.id}. Status: {upload.status}")

    except Exception as e:
        logger.error(f"Critical error processing upload {upload.id}: {e}")
        upload.status = UploadStatus.FAILED
        upload.error_message = f"System Error: {str(e)}"
        db.commit()

def save_timesheet_to_db(db: Session, upload: TimesheetUpload, data: dict):
    """
    Create database records from extracted data.
    """
    # 1. Resolve Employee and Client (In a real app, use fuzzy matching or IDs)
    # For now, we use the employee_id linked to the upload
    employee = db.query(Employee).filter(Employee.id == upload.employee_id).first()
    
    # Try to find client
    client_name = data.get("client_name", "")
    client = db.query(Client).filter(Client.name.ilike(f"%{client_name}%")).first()
    if not client:
        # Fallback or default
        client = db.query(Client).first() # Safety fallback for demo
    
    # 2. Create Timesheet
    ts = Timesheet(
        employee_id=employee.id,
        client_id=client.id if client else None,
        period_start=data.get("period_start_date"),
        period_end=data.get("period_end_date"),
        status=TimesheetStatus.DRAFT, # Needs approval
        total_hours=data.get("total_hours", 0.0),
        file_path=upload.file_path,
        submission_date=datetime.utcnow()
    )
    db.add(ts)
    db.flush() # Get ID

    # 3. Create Details
    for day in data.get("days", []):
        detail = TimesheetDetail(
            timesheet_id=ts.id,
            work_date=day.get("date"),
            hours=day.get("hours", 0.0),
            description=day.get("description", "")
        )
        db.add(detail)
    
    # Link upload
    # Assuming ProcessedFile link was handled during fetch, but we might want to link Timesheet <-> Upload?
    # The model `Timesheet` doesn't have `upload_id` directly, uses `file_path`.
    pass

"""
API router for timesheet upload operations.
Handles manual file uploads, listing uploads, and managing upload records.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime

from app.database import get_db
from app.models import TimesheetUpload, Employee, UploadSource, UploadStatus, UserRole
from app.schemas import TimesheetUploadResponse
from app.auth import get_current_employee, require_role
from app.services.file_storage import save_uploaded_file, validate_file_format, delete_file

router = APIRouter(prefix="/timesheets/uploads", tags=["timesheet_uploads"])


@router.post("/", response_model=TimesheetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_timesheet(
    file: UploadFile = File(...),
    employee_id: int = Form(...),
    current_user: Employee = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Upload a timesheet file manually (Admin only).
    Requires employee_id to map the timesheet to an employee.
    Supports PDF, JPG, CSV formats.
    """
    # Validate employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    
    # Validate file format
    is_valid, file_format = validate_file_format(file.filename)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Supported formats: PDF, JPG, CSV"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Save file to storage
        file_path, unique_filename = save_uploaded_file(
            file_content=file_content,
            original_filename=file.filename,
            employee_id=employee_id
        )
        
        # Create upload record
        upload = TimesheetUpload(
            employee_id=employee_id,
            file_path=file_path,
            file_name=unique_filename,
            file_format=file_format,
            source=UploadSource.MANUAL,
            status=UploadStatus.PENDING,
            uploaded_by=current_user.id,
            upload_metadata=json.dumps({
                "original_filename": file.filename,
                "file_size": len(file_content),
                "uploaded_at": datetime.utcnow().isoformat()
            })
        )
        
        db.add(upload)
        db.commit()
        db.refresh(upload)
        
        return upload
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/", response_model=List[TimesheetUploadResponse])
def list_uploads(
    employee_id: Optional[int] = None,
    source: Optional[UploadSource] = None,
    status_filter: Optional[UploadStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_user: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """
    List all uploaded timesheets with optional filters.
    Admin and Manager can view all uploads.
    """
    query = db.query(TimesheetUpload)
    
    # Apply filters
    if employee_id:
        query = query.filter(TimesheetUpload.employee_id == employee_id)
    
    if source:
        query = query.filter(TimesheetUpload.source == source)
    
    if status_filter:
        query = query.filter(TimesheetUpload.status == status_filter)
    
    # Order by most recent first
    query = query.order_by(TimesheetUpload.created_at.desc())
    
    uploads = query.offset(skip).limit(limit).all()
    
    return uploads


@router.get("/{upload_id}", response_model=TimesheetUploadResponse)
def get_upload(
    upload_id: int,
    current_user: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific upload.
    """
    upload = db.query(TimesheetUpload).filter(TimesheetUpload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload with ID {upload_id} not found"
        )
    
    return upload


@router.delete("/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_upload(
    upload_id: int,
    current_user: Employee = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Delete an uploaded timesheet (Admin only).
    Removes both the database record and the file from storage.
    """
    upload = db.query(TimesheetUpload).filter(TimesheetUpload.id == upload_id).first()
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload with ID {upload_id} not found"
        )
    
    try:
        # Delete file from storage
        delete_file(upload.file_path)
        
        # Delete database record
        db.delete(upload)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting upload: {str(e)}"
        )


@router.get("/stats/summary")
def get_upload_stats(
    current_user: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """
    Get statistics about uploaded timesheets.
    Returns counts by source and status.
    """
    # Total uploads
    total = db.query(TimesheetUpload).count()
    
    # By source
    manual_count = db.query(TimesheetUpload).filter(TimesheetUpload.source == UploadSource.MANUAL).count()
    email_count = db.query(TimesheetUpload).filter(TimesheetUpload.source == UploadSource.EMAIL).count()
    drive_count = db.query(TimesheetUpload).filter(TimesheetUpload.source == UploadSource.DRIVE).count()
    
    # By status
    pending_count = db.query(TimesheetUpload).filter(TimesheetUpload.status == UploadStatus.PENDING).count()
    processing_count = db.query(TimesheetUpload).filter(TimesheetUpload.status == UploadStatus.PROCESSING).count()
    analyzed_count = db.query(TimesheetUpload).filter(TimesheetUpload.status == UploadStatus.ANALYZED).count()
    failed_count = db.query(TimesheetUpload).filter(TimesheetUpload.status == UploadStatus.FAILED).count()
    
    return {
        "total": total,
        "by_source": {
            "manual": manual_count,
            "email": email_count,
            "drive": drive_count
        },
        "by_status": {
            "pending": pending_count,
            "processing": processing_count,
            "analyzed": analyzed_count,
            "failed": failed_count
        }
    }

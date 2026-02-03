"""
API router for manual monitoring triggers and scheduler control.
Allows admin to manually trigger monitoring jobs and check scheduler status.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.auth import require_role
from app.services.email_service import run_email_monitoring
from app.services.drive_service import run_drive_monitoring
from app.services.scheduler import get_scheduler_status

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.post("/email/run")
def trigger_email_monitoring(
    current_user: Employee = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Manually trigger email monitoring (Admin only).
    Useful for testing or immediate sync.
    """
    try:
        result = run_email_monitoring(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running email monitoring: {str(e)}"
        )


@router.post("/drive/run")
def trigger_drive_monitoring(
    current_user: Employee = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Manually trigger Drive monitoring (Admin only).
    Useful for testing or immediate sync.
    """
    try:
        result = run_drive_monitoring(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running Drive monitoring: {str(e)}"
        )


@router.get("/status")
def get_monitoring_status(
    current_user: Employee = Depends(require_role(["admin"]))
):
    """
    Get status of background monitoring jobs (Admin only).
    Shows if scheduler is running and next run times.
    """
    return get_scheduler_status()

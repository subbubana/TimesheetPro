from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Employee, UserRole, Notification, NotificationStatus
from app.schemas import NotificationCreate, NotificationResponse
from app.auth import require_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    employee_id: int
    notification_type: str = "timesheet_reminder"
    subject: str = "Timesheet Reminder"
    message: str = "Please submit your timesheet for the current period."


class BulkNotificationRequest(BaseModel):
    employee_ids: List[int]
    notification_type: str = "timesheet_reminder"
    subject: str = "Timesheet Reminder"
    message: str = "Please submit your timesheet for the current period."


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def send_notification(
    notification_data: SendNotificationRequest,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """
    Send a notification to an employee.
    In a production system, this would trigger an email/SMS.
    For now, it creates a notification record that can be processed by a background job.
    """
    employee = db.query(Employee).filter(Employee.id == notification_data.employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    notification = Notification(
        employee_id=notification_data.employee_id,
        notification_type=notification_data.notification_type,
        subject=notification_data.subject,
        message=notification_data.message,
        status=NotificationStatus.PENDING
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # In production, you would trigger an email service here
    # For now, we just mark it as sent for demo purposes
    # notification.status = NotificationStatus.SENT
    # notification.sent_at = datetime.utcnow()
    # db.commit()

    return notification


@router.post("/send-bulk", response_model=List[NotificationResponse], status_code=status.HTTP_201_CREATED)
def send_bulk_notifications(
    notification_data: BulkNotificationRequest,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """Send notifications to multiple employees at once."""
    notifications = []

    for employee_id in notification_data.employee_ids:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            continue  # Skip invalid employee IDs

        notification = Notification(
            employee_id=employee_id,
            notification_type=notification_data.notification_type,
            subject=notification_data.subject,
            message=notification_data.message,
            status=NotificationStatus.PENDING
        )

        db.add(notification)
        notifications.append(notification)

    db.commit()

    for notification in notifications:
        db.refresh(notification)

    return notifications


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 100,
    status: NotificationStatus = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """Get all notifications, optionally filtered by status."""
    query = db.query(Notification)

    if status:
        query = query.filter(Notification.status == status)

    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """Get a specific notification."""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification


@router.put("/{notification_id}/mark-sent", response_model=NotificationResponse)
def mark_notification_sent(
    notification_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Mark a notification as sent (for manual/testing purposes)."""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.status = NotificationStatus.SENT
    notification.sent_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)

    return notification

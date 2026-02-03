"""
Webhook endpoints for receiving Drive notifications and managing webhooks.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Employee
from app.auth import require_role
from app.services.drive_webhook import (
    register_drive_webhook,
    stop_drive_webhook,
    handle_drive_webhook
)
from app.services.email_idle import (
    start_email_idle,
    stop_email_idle,
    get_email_idle_status
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ===== Google Drive Webhooks =====

@router.post("/drive")
async def receive_drive_notification(
    request: Request,
    x_goog_channel_id: Optional[str] = Header(None),
    x_goog_resource_id: Optional[str] = Header(None),
    x_goog_resource_state: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for Google Drive push notifications.
    This is called by Google when files change in the monitored folder.
    
    NOTE: This endpoint must be publicly accessible via HTTPS.
    """
    headers = {
        'X-Goog-Channel-ID': x_goog_channel_id,
        'X-Goog-Resource-ID': x_goog_resource_id,
        'X-Goog-Resource-State': x_goog_resource_state
    }
    
    print(f"Received Drive webhook: {headers}")
    
    # Handle sync event (initial verification)
    if x_goog_resource_state == 'sync':
        return {"message": "Webhook verified"}
    
    # Process the notification
    result = handle_drive_webhook(db, headers)
    return result


@router.post("/drive/register")
def register_webhook(
    webhook_url: str,
    current_user: Employee = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Register a webhook with Google Drive (Admin only).
    
    Args:
        webhook_url: Public HTTPS URL where Drive will send notifications
                    (e.g., https://yourdomain.com/webhooks/drive)
    
    NOTE: URL must be publicly accessible and use HTTPS.
    """
    result = register_drive_webhook(db, webhook_url)
    
    if not result.get('success'):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get('message', 'Failed to register webhook')
        )
    
    return result


@router.post("/drive/stop")
def stop_webhook(
    current_user: Employee = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Stop receiving Drive push notifications (Admin only).
    """
    result = stop_drive_webhook(db)
    
    if not result.get('success'):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get('message', 'Failed to stop webhook')
        )
    
    return result


# ===== Email IDLE Control =====

@router.post("/email/start")
def start_email_monitoring(
    current_user: Employee = Depends(require_role(["admin"]))
):
    """
    Start email IDLE monitoring service (Admin only).
    Maintains a connection and receives real-time notifications.
    """
    try:
        start_email_idle()
        return {
            "success": True,
            "message": "Email IDLE monitoring started",
            "method": "IMAP IDLE (real-time)"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/email/stop")
def stop_email_monitoring(
    current_user: Employee = Depends(require_role(["admin"]))
):
    """
    Stop email IDLE monitoring service (Admin only).
    """
    try:
        stop_email_idle()
        return {
            "success": True,
            "message": "Email IDLE monitoring stopped"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/email/status")
def get_email_status(
    current_user: Employee = Depends(require_role(["admin"]))
):
    """
    Get email IDLE service status (Admin only).
    """
    return get_email_idle_status()


# ===== Overall Status =====

@router.get("/status")
def get_webhook_status(
    current_user: Employee = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Get status of all webhook services (Admin only).
    """
    from app.models import IntegrationConfig, IntegrationType
    from app.services.drive_webhook import decrypt_config
    
    # Check Drive webhook
    drive_config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()
    
    drive_webhook_active = False
    drive_webhook_info = None
    
    if drive_config:
        try:
            config_data = decrypt_config(drive_config.config_data)
            webhook_info = config_data.get('webhook')
            if webhook_info:
                drive_webhook_active = True
                drive_webhook_info = {
                    "channel_id": webhook_info.get('channel_id'),
                    "expiration": webhook_info.get('expiration'),
                    "registered_at": webhook_info.get('registered_at')
                }
        except:
            pass
    
    # Check email IDLE
    email_status = get_email_idle_status()
    
    return {
        "drive": {
            "active": drive_webhook_active,
            "method": "Google Push Notifications (real-time)",
            "webhook_info": drive_webhook_info
        },
        "email": email_status
    }

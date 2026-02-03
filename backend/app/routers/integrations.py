"""
API router for integration configuration (Email and Google Drive).
Handles configuration, testing connections, OAuth flows, and managing integration settings.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
from datetime import datetime
from cryptography.fernet import Fernet
import os
import secrets
from urllib.parse import urlencode

from app.database import get_db
from app.models import IntegrationConfig, Employee, IntegrationType
from app.schemas import (
    EmailConfigCreate, EmailConfigResponse,
    DriveConfigCreate, DriveConfigResponse,
    IntegrationConfigResponse
)
from app.auth import require_role, get_current_employee

router = APIRouter(prefix="/integrations", tags=["integrations"])

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/integrations/oauth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# OAuth state storage (in production, use Redis or database)
oauth_states = {}

# Encryption key for sensitive config data (should be in environment variable)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)


def encrypt_config(config_dict: dict) -> str:
    """Encrypt configuration data"""
    json_str = json.dumps(config_dict)
    encrypted = cipher_suite.encrypt(json_str.encode())
    return encrypted.decode()


def decrypt_config(encrypted_str: str) -> dict:
    """Decrypt configuration data"""
    decrypted = cipher_suite.decrypt(encrypted_str.encode())
    return json.loads(decrypted.decode())


# Email Integration Endpoints
@router.post("/email", response_model=EmailConfigResponse, status_code=status.HTTP_201_CREATED)
def create_email_config(
    config: EmailConfigCreate,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Configure email integration (Admin only).
    Stores IMAP settings encrypted.
    """
    # Check if email config already exists
    existing = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.EMAIL
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email integration already configured. Use PUT to update."
        )
    
    # Encrypt sensitive data
    config_data = {
        "imap_server": config.imap_server,
        "imap_port": config.imap_port,
        "email": config.email,
        "password": config.password
    }
    encrypted_data = encrypt_config(config_data)
    
    # Create config record
    integration = IntegrationConfig(
        type=IntegrationType.EMAIL,
        config_data=encrypted_data,
        is_active=False  # Start as inactive until tested
    )
    
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    return integration


@router.get("/email", response_model=EmailConfigResponse)
def get_email_config(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get email integration configuration (Admin only)."""
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.EMAIL
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email integration not configured"
        )
    
    return config


@router.put("/email", response_model=EmailConfigResponse)
def update_email_config(
    config: EmailConfigCreate,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update email integration configuration (Admin only)."""
    existing = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.EMAIL
    ).first()
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email integration not configured. Use POST to create."
        )
    
    # Encrypt new data
    config_data = {
        "imap_server": config.imap_server,
        "imap_port": config.imap_port,
        "email": config.email,
        "password": config.password
    }
    encrypted_data = encrypt_config(config_data)
    
    existing.config_data = encrypted_data
    existing.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(existing)
    
    return existing


# Drive Integration Endpoints
@router.post("/drive", response_model=DriveConfigResponse, status_code=status.HTTP_201_CREATED)
def create_drive_config(
    config: DriveConfigCreate,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Configure Google Drive integration (Admin only).
    Stores OAuth credentials and folder ID encrypted.
    """
    # Check if drive config already exists
    existing = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Drive integration already configured. Use PUT to update."
        )
    
    # Encrypt sensitive data
    config_data = {
        "oauth_credentials": config.oauth_credentials,
        "folder_id": config.folder_id
    }
    encrypted_data = encrypt_config(config_data)
    
    # Create config record
    integration = IntegrationConfig(
        type=IntegrationType.DRIVE,
        config_data=encrypted_data,
        is_active=False  # Start as inactive until tested
    )
    
    db.add(integration)
    db.commit()
    db.refresh(integration)
    
    return integration


@router.get("/drive", response_model=DriveConfigResponse)
def get_drive_config(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get Google Drive integration configuration (Admin only)."""
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drive integration not configured"
        )
    
    return config


@router.put("/drive", response_model=DriveConfigResponse)
def update_drive_config(
    config: DriveConfigCreate,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update Google Drive integration configuration (Admin only)."""
    existing = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drive integration not configured. Use POST to create."
        )
    
    # Encrypt new data
    config_data = {
        "oauth_credentials": config.oauth_credentials,
        "folder_id": config.folder_id
    }
    encrypted_data = encrypt_config(config_data)
    
    existing.config_data = encrypted_data
    existing.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(existing)
    
    return existing


# Common Endpoints
@router.post("/{integration_type}/toggle")
def toggle_integration(
    integration_type: IntegrationType,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Toggle integration monitoring on/off (Admin only).
    """
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == integration_type
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{integration_type.value} integration not configured"
        )
    
    config.is_active = not config.is_active
    config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(config)
    
    return {
        "type": integration_type.value,
        "is_active": config.is_active,
        "message": f"Monitoring {'enabled' if config.is_active else 'disabled'}"
    }


@router.post("/{integration_type}/test")
def test_integration(
    integration_type: IntegrationType,
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Test integration connection (Admin only).
    Returns success/failure status.
    """
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == integration_type
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{integration_type.value} integration not configured"
        )
    
    try:
        # Decrypt config
        config_data = decrypt_config(config.config_data)
        
        if integration_type == IntegrationType.EMAIL:
            # TODO: Implement actual IMAP connection test
            # For now, just validate config structure
            required_keys = ["imap_server", "imap_port", "email", "password"]
            if all(key in config_data for key in required_keys):
                return {
                    "success": True,
                    "message": "Email configuration is valid (connection test not yet implemented)",
                    "type": integration_type.value
                }
            else:
                return {
                    "success": False,
                    "message": "Invalid email configuration",
                    "type": integration_type.value
                }
        
        elif integration_type == IntegrationType.DRIVE:
            # TODO: Implement actual Drive API connection test
            # For now, just validate config structure
            required_keys = ["oauth_credentials", "folder_id"]
            if all(key in config_data for key in required_keys):
                return {
                    "success": True,
                    "message": "Drive configuration is valid (connection test not yet implemented)",
                    "type": integration_type.value
                }
            else:
                return {
                    "success": False,
                    "message": "Invalid Drive configuration",
                    "type": integration_type.value
                }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error testing connection: {str(e)}",
            "type": integration_type.value
        }


@router.get("/")
def list_integrations(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """List all configured integrations with status."""
    configs = db.query(IntegrationConfig).all()

    return {
        "integrations": [
            {
                "type": config.type.value,
                "is_active": config.is_active,
                "last_sync": config.last_sync,
                "sync_count": config.sync_count,
                "created_at": config.created_at,
                "updated_at": config.updated_at
            }
            for config in configs
        ]
    }


# ============== Google OAuth Endpoints ==============

@router.get("/status")
@router.get("/status")
def get_integration_status(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get connection status for all integrations."""
    email_config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.EMAIL
    ).first()

    drive_config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()
    
    email_info = None
    if email_config and email_config.is_active:
        try:
            data = decrypt_config(email_config.config_data)
            email_info = data.get("email")
        except:
            pass

    drive_info = None
    if drive_config and drive_config.is_active:
        try:
            data = decrypt_config(drive_config.config_data)
            drive_info = data.get("folder_id")
        except:
            pass

    return {
        "gmail": {
            "connected": email_config is not None and email_config.is_active,
            "configured": email_config is not None,
            "last_sync": email_config.last_sync if email_config else None,
            "email": email_info
        },
        "drive": {
            "connected": drive_config is not None and drive_config.is_active,
            "configured": drive_config is not None,
            "last_sync": drive_config.last_sync if drive_config else None,
            "folder_id": drive_info
        }
    }


@router.get("/gmail/auth")
def gmail_auth_url(
    current_user: Employee = Depends(require_role("admin"))
):
    """Generate Gmail OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
        )

    # Generate state token for security
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": current_user.id,
        "type": "gmail",
        "created_at": datetime.utcnow()
    }

    # Gmail OAuth scopes
    scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "openid",
        "email",
        "profile"
    ]

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return {"auth_url": auth_url}


@router.get("/drive/auth")
def drive_auth_url(
    current_user: Employee = Depends(require_role("admin"))
):
    """Generate Google Drive OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
        )

    # Generate state token for security
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": current_user.id,
        "type": "drive",
        "created_at": datetime.utcnow()
    }

    # Drive OAuth scopes
    scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.file",
        "openid",
        "email",
        "profile"
    ]

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return {"auth_url": auth_url}


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    """Handle OAuth callback from Google."""
    # Check for errors
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connect?error={error}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connect?error=missing_params"
        )

    # Validate state
    if state not in oauth_states:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connect?error=invalid_state"
        )

    state_data = oauth_states.pop(state)
    integration_type = state_data["type"]

    try:
        import httpx

        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=token_data)

            if response.status_code != 200:
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/connect?error=token_exchange_failed"
                )

            tokens = response.json()

            # Get user info
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            userinfo = userinfo_response.json()

        # Store the credentials
        config_data = {
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "token_type": tokens.get("token_type"),
            "expires_in": tokens.get("expires_in"),
            "email": userinfo.get("email"),
            "name": userinfo.get("name")
        }

        encrypted_data = encrypt_config(config_data)

        # Determine integration type
        int_type = IntegrationType.EMAIL if integration_type == "gmail" else IntegrationType.DRIVE

        # Check if config exists
        existing = db.query(IntegrationConfig).filter(
            IntegrationConfig.type == int_type
        ).first()

        if existing:
            existing.config_data = encrypted_data
            existing.is_active = True
            existing.updated_at = datetime.utcnow()
        else:
            integration = IntegrationConfig(
                type=int_type,
                config_data=encrypted_data,
                is_active=True
            )
            db.add(integration)

        db.commit()

        return RedirectResponse(
            url=f"{FRONTEND_URL}/connect?success={integration_type}"
        )

    except Exception as e:
        import traceback
        print(f"OAuth Callback Error: {e}")
        traceback.print_exc()
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connect?error=server_error"
        )


@router.delete("/gmail/disconnect")
def disconnect_gmail(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Disconnect Gmail integration."""
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.EMAIL
    ).first()

    if config:
        db.delete(config)
        db.commit()

    return {"message": "Gmail disconnected successfully"}


@router.delete("/drive/disconnect")
def disconnect_drive(
    current_user: Employee = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Disconnect Google Drive integration."""
    config = db.query(IntegrationConfig).filter(
        IntegrationConfig.type == IntegrationType.DRIVE
    ).first()

    if config:
        db.delete(config)
        db.commit()

    return {"message": "Google Drive disconnected successfully"}

"""
Google Drive webhook service using Push Notifications API.
Registers a webhook with Google Drive to receive real-time notifications when files change.
"""
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import os
import uuid

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.models import IntegrationConfig, IntegrationType
from app.services.drive_service import DriveMonitoringService


def decrypt_config(encrypted_str: str) -> dict:
    """Decrypt configuration data"""
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
    cipher_suite = Fernet(ENCRYPTION_KEY)
    decrypted = cipher_suite.decrypt(encrypted_str.encode())
    return json.loads(decrypted.decode())


class DriveWebhookService:
    """Service for managing Google Drive push notifications"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config = None
        self.drive_service = None
        
    def load_config(self) -> bool:
        """Load Drive integration configuration"""
        config = self.db.query(IntegrationConfig).filter(
            IntegrationConfig.type == IntegrationType.DRIVE
        ).first()
        
        if not config:
            print("Drive integration not configured")
            return False
        
        try:
            self.config = decrypt_config(config.config_data)
            return True
        except Exception as e:
            print(f"Error loading Drive config: {e}")
            return False
    
    def connect_to_drive(self) -> bool:
        """Connect to Google Drive API"""
        try:
            oauth_creds = json.loads(self.config['oauth_credentials'])
            
            creds = Credentials(
                token=oauth_creds.get('token'),
                refresh_token=oauth_creds.get('refresh_token'),
                token_uri=oauth_creds.get('token_uri', 'https://oauth2.googleapis.com/token'),
                client_id=oauth_creds.get('client_id'),
                client_secret=oauth_creds.get('client_secret'),
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            
            self.drive_service = build('drive', 'v3', credentials=creds)
            return True
            
        except Exception as e:
            print(f"Error connecting to Google Drive: {e}")
            return False
    
    def register_webhook(self, webhook_url: str) -> dict:
        """
        Register a webhook with Google Drive to receive push notifications.
        
        Args:
            webhook_url: Public HTTPS URL where Drive will send notifications
                        (e.g., https://yourdomain.com/webhooks/drive)
        
        Returns:
            dict with channel info or error
        """
        if not self.load_config():
            return {"success": False, "message": "Drive configuration not loaded"}
        
        if not self.connect_to_drive():
            return {"success": False, "message": "Failed to connect to Drive"}
        
        try:
            folder_id = self.config['folder_id']
            
            # Generate unique channel ID
            channel_id = f"timesheetpro-{uuid.uuid4()}"
            
            # Set expiration (max 24 hours for files, we'll use 23 hours)
            expiration = int((datetime.utcnow() + timedelta(hours=23)).timestamp() * 1000)
            
            # Create watch request
            body = {
                'id': channel_id,
                'type': 'web_hook',
                'address': webhook_url,
                'expiration': expiration
            }
            
            # Register the webhook
            response = self.drive_service.files().watch(
                fileId=folder_id,
                body=body,
                supportsAllDrives=True
            ).execute()
            
            # Store channel info in config metadata
            config = self.db.query(IntegrationConfig).filter(
                IntegrationConfig.type == IntegrationType.DRIVE
            ).first()
            
            if config:
                # Decrypt existing config
                existing_config = decrypt_config(config.config_data)
                
                # Add webhook info
                existing_config['webhook'] = {
                    'channel_id': response['id'],
                    'resource_id': response['resourceId'],
                    'expiration': response['expiration'],
                    'webhook_url': webhook_url,
                    'registered_at': datetime.utcnow().isoformat()
                }
                
                # Re-encrypt and save
                ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
                cipher_suite = Fernet(ENCRYPTION_KEY)
                encrypted_data = cipher_suite.encrypt(json.dumps(existing_config).encode()).decode()
                
                config.config_data = encrypted_data
                self.db.commit()
            
            print(f"Webhook registered: {channel_id}")
            return {
                "success": True,
                "message": "Webhook registered successfully",
                "channel_id": response['id'],
                "resource_id": response['resourceId'],
                "expiration": datetime.fromtimestamp(int(response['expiration']) / 1000).isoformat()
            }
            
        except Exception as e:
            print(f"Error registering webhook: {e}")
            return {"success": False, "message": str(e)}
    
    def stop_webhook(self) -> dict:
        """Stop receiving push notifications"""
        if not self.load_config():
            return {"success": False, "message": "Drive configuration not loaded"}
        
        if not self.connect_to_drive():
            return {"success": False, "message": "Failed to connect to Drive"}
        
        try:
            # Get webhook info from config
            webhook_info = self.config.get('webhook')
            
            if not webhook_info:
                return {"success": False, "message": "No active webhook found"}
            
            # Stop the channel
            body = {
                'id': webhook_info['channel_id'],
                'resourceId': webhook_info['resource_id']
            }
            
            self.drive_service.channels().stop(body=body).execute()
            
            # Remove webhook info from config
            config = self.db.query(IntegrationConfig).filter(
                IntegrationConfig.type == IntegrationType.DRIVE
            ).first()
            
            if config:
                existing_config = decrypt_config(config.config_data)
                existing_config.pop('webhook', None)
                
                ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
                cipher_suite = Fernet(ENCRYPTION_KEY)
                encrypted_data = cipher_suite.encrypt(json.dumps(existing_config).encode()).decode()
                
                config.config_data = encrypted_data
                self.db.commit()
            
            return {"success": True, "message": "Webhook stopped successfully"}
            
        except Exception as e:
            print(f"Error stopping webhook: {e}")
            return {"success": False, "message": str(e)}
    
    def handle_notification(self, headers: dict) -> dict:
        """
        Handle incoming webhook notification from Google Drive.
        
        Args:
            headers: Request headers from Drive notification
        
        Returns:
            dict with processing result
        """
        try:
            # Extract notification details
            channel_id = headers.get('X-Goog-Channel-ID')
            resource_id = headers.get('X-Goog-Resource-ID')
            resource_state = headers.get('X-Goog-Resource-State')
            
            print(f"Drive notification: {resource_state} for channel {channel_id}")
            
            # Only process 'change' or 'sync' events
            if resource_state not in ['change', 'sync']:
                return {"success": True, "message": "Ignored non-change event"}
            
            # Run the monitoring service to process new files
            monitoring_service = DriveMonitoringService(self.db)
            result = monitoring_service.monitor_folder()
            
            return result
            
        except Exception as e:
            print(f"Error handling Drive notification: {e}")
            return {"success": False, "message": str(e)}


def register_drive_webhook(db: Session, webhook_url: str) -> dict:
    """Register Drive webhook"""
    service = DriveWebhookService(db)
    return service.register_webhook(webhook_url)


def stop_drive_webhook(db: Session) -> dict:
    """Stop Drive webhook"""
    service = DriveWebhookService(db)
    return service.stop_webhook()


def handle_drive_webhook(db: Session, headers: dict) -> dict:
    """Handle Drive webhook notification"""
    service = DriveWebhookService(db)
    return service.handle_notification(headers)

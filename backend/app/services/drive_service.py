"""
Google Drive monitoring service for automatic timesheet collection.
Monitors a specified Drive folder for files owned by registered employees.
"""
import json
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import os
import io

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from app.models import (
    IntegrationConfig, IntegrationType, Employee,
    TimesheetUpload, ProcessedFile, UploadSource, UploadStatus
)
from app.services.file_storage import save_uploaded_file, validate_file_format


def decrypt_config(encrypted_str: str) -> dict:
    """Decrypt configuration data"""
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
    cipher_suite = Fernet(ENCRYPTION_KEY)
    decrypted = cipher_suite.decrypt(encrypted_str.encode())
    return json.loads(decrypted.decode())


class DriveMonitoringService:
    """Service for monitoring Google Drive folder for timesheet files"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config = None
        self.drive_service = None
        
    def load_config(self) -> bool:
        """Load Drive integration configuration"""
        config = self.db.query(IntegrationConfig).filter(
            IntegrationConfig.type == IntegrationType.DRIVE,
            IntegrationConfig.is_active == True
        ).first()
        
        if not config:
            print("Drive integration not configured or not active")
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
            # Handle new token-based config (from Connect page)
            if 'access_token' in self.config:
                creds = Credentials(
                    token=self.config.get('access_token'),
                    refresh_token=self.config.get('refresh_token'),
                    token_uri='https://oauth2.googleapis.com/token',
                    client_id=os.getenv('GOOGLE_CLIENT_ID'),
                    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
                    scopes=['https://www.googleapis.com/auth/drive.readonly']
                )
            # Handle legacy JSON config (from old manual upload)
            elif 'oauth_credentials' in self.config:
                # Parse OAuth credentials
                oauth_creds = json.loads(self.config['oauth_credentials'])
                
                # Create credentials object
                creds = Credentials(
                    token=oauth_creds.get('token'),
                    refresh_token=oauth_creds.get('refresh_token'),
                    token_uri=oauth_creds.get('token_uri', 'https://oauth2.googleapis.com/token'),
                    client_id=oauth_creds.get('client_id'),
                    client_secret=oauth_creds.get('client_secret'),
                    scopes=['https://www.googleapis.com/auth/drive.readonly']
                )
            else:
                print("No valid Drive credentials found")
                return False
            
            # Build Drive service
            self.drive_service = build('drive', 'v3', credentials=creds)
            print("Successfully connected to Google Drive")
            return True
            
        except Exception as e:
            print(f"Error connecting to Google Drive: {e}")
            return False
    
    def get_employee_emails(self) -> dict:
        """Get mapping of employee emails to employee IDs"""
        employees = self.db.query(Employee).filter(Employee.is_active == True).all()
        return {emp.email.lower(): emp.id for emp in employees}
    
    def is_file_processed(self, file_id: str) -> bool:
        """Check if file has already been processed"""
        return self.db.query(ProcessedFile).filter(
            ProcessedFile.source == UploadSource.DRIVE,
            ProcessedFile.external_id == file_id
        ).first() is not None
    
    def mark_file_processed(self, file_id: str, employee_id: int, upload_id: Optional[int] = None):
        """Mark file as processed"""
        processed = ProcessedFile(
            source=UploadSource.DRIVE,
            external_id=file_id,
            employee_id=employee_id,
            upload_id=upload_id
        )
        self.db.add(processed)
        self.db.commit()
    
    def get_file_owner_email(self, file_id: str) -> Optional[str]:
        """Get the email of the file owner"""
        try:
            file_metadata = self.drive_service.files().get(
                fileId=file_id,
                fields='owners'
            ).execute()
            
            owners = file_metadata.get('owners', [])
            if owners:
                return owners[0].get('emailAddress', '').lower()
            
            return None
            
        except Exception as e:
            print(f"Error getting file owner: {e}")
            return None
    
    def download_file(self, file_id: str) -> Optional[bytes]:
        """Download file content from Drive"""
        try:
            request = self.drive_service.files().get_media(fileId=file_id)
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_buffer.seek(0)
            return file_buffer.read()
            
        except Exception as e:
            print(f"Error downloading file: {e}")
            return None
    
    def process_file(self, file_metadata: dict, employee_emails: dict) -> bool:
        """Process a single Drive file"""
        try:
            file_id = file_metadata['id']
            file_name = file_metadata['name']
            
            # Check if already processed
            if self.is_file_processed(file_id):
                return False
            
            # Get file owner email
            owner_email = self.get_file_owner_email(file_id)
            
            if not owner_email:
                print(f"Could not determine owner for file: {file_name}")
                return False
            
            # Check if owner is a registered employee
            if owner_email not in employee_emails:
                print(f"File {file_name} owned by {owner_email} - not a registered employee, skipping")
                return False
            
            employee_id = employee_emails[owner_email]
            
            # Validate file format
            is_valid, file_format = validate_file_format(file_name)
            
            if not is_valid:
                print(f"Skipping invalid file format: {file_name}")
                return False
            
            # Download file
            file_content = self.download_file(file_id)
            
            if not file_content:
                print(f"Failed to download file: {file_name}")
                return False
            
            # Save file
            file_path, unique_filename = save_uploaded_file(
                file_content=file_content,
                original_filename=file_name,
                employee_id=employee_id
            )
            
            # Create upload record
            upload = TimesheetUpload(
                employee_id=employee_id,
                file_path=file_path,
                file_name=unique_filename,
                file_format=file_format,
                source=UploadSource.DRIVE,
                status=UploadStatus.PENDING,
                upload_metadata=json.dumps({
                    "original_filename": file_name,
                    "file_size": len(file_content),
                    "drive_file_id": file_id,
                    "owner_email": owner_email,
                    "modified_time": file_metadata.get('modifiedTime', ''),
                    "created_time": file_metadata.get('createdTime', '')
                })
            )
            
            self.db.add(upload)
            self.db.commit()
            self.db.refresh(upload)
            
            # Mark file as processed
            self.mark_file_processed(file_id, employee_id, upload.id)
            
            print(f"Processed file {file_name} from {owner_email}")
            return True
            
        except Exception as e:
            print(f"Error processing file {file_metadata.get('name', 'unknown')}: {e}")
            self.db.rollback()
            return False
    
    def monitor_folder(self) -> dict:
        """Monitor Drive folder and process new files"""
        if not self.load_config():
            return {"success": False, "message": "Drive configuration not loaded"}
        
        if not self.connect_to_drive():
            return {"success": False, "message": "Failed to connect to Google Drive"}
        
        try:
            folder_id = self.config['folder_id']
            
            # Get employee emails
            employee_emails = self.get_employee_emails()
            
            if not employee_emails:
                return {"success": False, "message": "No active employees found"}
            
            # Query files in folder
            query = f"'{folder_id}' in parents and trashed=false"
            results = self.drive_service.files().list(
                q=query,
                fields='files(id, name, mimeType, owners, modifiedTime, createdTime)',
                pageSize=100
            ).execute()
            
            files = results.get('files', [])
            total_files = len(files)
            processed_count = 0
            
            # Process each file
            for file_metadata in files:
                if self.process_file(file_metadata, employee_emails):
                    processed_count += 1
            
            # Update integration config
            config = self.db.query(IntegrationConfig).filter(
                IntegrationConfig.type == IntegrationType.DRIVE
            ).first()
            
            if config:
                config.last_sync = datetime.utcnow()
                config.sync_count += processed_count
                self.db.commit()
            
            return {
                "success": True,
                "message": f"Processed {processed_count} files from {total_files} total files",
                "total_files": total_files,
                "processed_files": processed_count
            }
            
        except Exception as e:
            print(f"Error monitoring Drive folder: {e}")
            return {"success": False, "message": str(e)}


def run_drive_monitoring(db: Session) -> dict:
    """Run Drive monitoring service"""
    service = DriveMonitoringService(db)
    return service.monitor_folder()

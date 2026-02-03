"""
Email monitoring service for automatic timesheet collection.
Monitors IMAP inbox for emails from registered employees with timesheet attachments.
"""
import imaplib
import email
from email.header import decode_header
import json
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import os

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


class EmailMonitoringService:
    """Service for monitoring email inbox for timesheet attachments"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config = None
        self.imap_server = None
        
    def load_config(self) -> bool:
        """Load email integration configuration"""
        config = self.db.query(IntegrationConfig).filter(
            IntegrationConfig.type == IntegrationType.EMAIL,
            IntegrationConfig.is_active == True
        ).first()
        
        if not config:
            print("Email integration not configured or not active")
            return False
        
        try:
            self.config = decrypt_config(config.config_data)
            return True
        except Exception as e:
            print(f"Error loading email config: {e}")
            return False
    
    def connect_to_inbox(self) -> bool:
        """Connect to IMAP server"""
        try:
            self.imap_server = imaplib.IMAP4_SSL(
                self.config['imap_server'],
                self.config['imap_port']
            )
            self.imap_server.login(
                self.config['email'],
                self.config['password']
            )
            self.imap_server.select('INBOX')
            print("Successfully connected to email inbox")
            return True
        except Exception as e:
            print(f"Error connecting to email inbox: {e}")
            return False
    
    def get_employee_emails(self) -> dict:
        """Get mapping of employee emails to employee IDs"""
        employees = self.db.query(Employee).filter(Employee.is_active == True).all()
        return {emp.email.lower(): emp.id for emp in employees}
    
    def is_email_processed(self, message_id: str) -> bool:
        """Check if email has already been processed"""
        return self.db.query(ProcessedFile).filter(
            ProcessedFile.source == UploadSource.EMAIL,
            ProcessedFile.external_id == message_id
        ).first() is not None
    
    def mark_email_processed(self, message_id: str, employee_id: int, upload_id: Optional[int] = None):
        """Mark email as processed"""
        processed = ProcessedFile(
            source=UploadSource.EMAIL,
            external_id=message_id,
            employee_id=employee_id,
            upload_id=upload_id
        )
        self.db.add(processed)
        self.db.commit()
    
    def extract_attachments(self, msg) -> List[Tuple[str, bytes]]:
        """Extract attachments from email message"""
        attachments = []
        
        for part in msg.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            if part.get('Content-Disposition') is None:
                continue
            
            filename = part.get_filename()
            if filename:
                # Decode filename if needed
                if decode_header(filename)[0][1] is not None:
                    filename = decode_header(filename)[0][0].decode(decode_header(filename)[0][1])
                
                # Get file content
                file_data = part.get_payload(decode=True)
                
                if file_data:
                    attachments.append((filename, file_data))
        
        return attachments
    
    def process_email(self, email_id: bytes, employee_emails: dict) -> int:
        """Process a single email and save attachments"""
        processed_count = 0
        
        try:
            # Fetch email
            _, msg_data = self.imap_server.fetch(email_id, '(RFC822)')
            email_body = msg_data[0][1]
            msg = email.message_from_bytes(email_body)
            
            # Get message ID
            message_id = msg.get('Message-ID', f"no-id-{email_id.decode()}")
            
            # Check if already processed
            if self.is_email_processed(message_id):
                return 0
            
            # Get sender email
            from_header = msg.get('From', '')
            # Extract email address from "Name <email@domain.com>" format
            if '<' in from_header and '>' in from_header:
                sender_email = from_header.split('<')[1].split('>')[0].strip().lower()
            else:
                sender_email = from_header.strip().lower()
            
            # Check if sender is a registered employee
            if sender_email not in employee_emails:
                print(f"Email from {sender_email} - not a registered employee, skipping")
                return 0
            
            employee_id = employee_emails[sender_email]
            
            # Extract attachments
            attachments = self.extract_attachments(msg)
            
            if not attachments:
                print(f"Email from {sender_email} has no attachments, skipping")
                return 0
            
            # Process each attachment
            for filename, file_data in attachments:
                # Validate file format
                is_valid, file_format = validate_file_format(filename)
                
                if not is_valid:
                    print(f"Skipping invalid file format: {filename}")
                    continue
                
                try:
                    # Save file
                    file_path, unique_filename = save_uploaded_file(
                        file_content=file_data,
                        original_filename=filename,
                        employee_id=employee_id
                    )
                    
                    # Create upload record
                    upload = TimesheetUpload(
                        employee_id=employee_id,
                        file_path=file_path,
                        file_name=unique_filename,
                        file_format=file_format,
                        source=UploadSource.EMAIL,
                        status=UploadStatus.PENDING,
                        upload_metadata=json.dumps({
                            "original_filename": filename,
                            "file_size": len(file_data),
                            "email_subject": msg.get('Subject', 'No Subject'),
                            "email_from": from_header,
                            "email_date": msg.get('Date', ''),
                            "message_id": message_id
                        })
                    )
                    
                    self.db.add(upload)
                    self.db.commit()
                    self.db.refresh(upload)
                    
                    # Mark email as processed
                    self.mark_email_processed(message_id, employee_id, upload.id)
                    
                    processed_count += 1
                    print(f"Processed attachment {filename} from {sender_email}")
                    
                except Exception as e:
                    print(f"Error processing attachment {filename}: {e}")
                    self.db.rollback()
            
        except Exception as e:
            print(f"Error processing email {email_id}: {e}")
            self.db.rollback()
        
        return processed_count
    
    def monitor_inbox(self) -> dict:
        """Monitor inbox and process new emails"""
        if not self.load_config():
            return {"success": False, "message": "Email configuration not loaded"}
        
        if not self.connect_to_inbox():
            return {"success": False, "message": "Failed to connect to inbox"}
        
        try:
            # Get employee emails
            employee_emails = self.get_employee_emails()
            
            if not employee_emails:
                return {"success": False, "message": "No active employees found"}
            
            # Search for all emails in inbox
            _, message_numbers = self.imap_server.search(None, 'ALL')
            
            total_emails = 0
            processed_count = 0
            
            for email_id in message_numbers[0].split():
                total_emails += 1
                processed_count += self.process_email(email_id, employee_emails)
            
            # Update integration config
            config = self.db.query(IntegrationConfig).filter(
                IntegrationConfig.type == IntegrationType.EMAIL
            ).first()
            
            if config:
                config.last_sync = datetime.utcnow()
                config.sync_count += processed_count
                self.db.commit()
            
            # Close connection
            self.imap_server.close()
            self.imap_server.logout()
            
            return {
                "success": True,
                "message": f"Processed {processed_count} attachments from {total_emails} emails",
                "total_emails": total_emails,
                "processed_attachments": processed_count
            }
            
        except Exception as e:
            print(f"Error monitoring inbox: {e}")
            return {"success": False, "message": str(e)}


def run_email_monitoring(db: Session) -> dict:
    """Run email monitoring service"""
    service = EmailMonitoringService(db)
    return service.monitor_inbox()

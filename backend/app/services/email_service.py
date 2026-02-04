"""
Email monitoring service for automatic timesheet collection.
Monitors IMAP inbox or Gmail via API for emails from registered employees with timesheet attachments.
"""
import imaplib
import email
from email.header import decode_header
import json
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Any, Dict
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import os
import base64
import time

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

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
        self.gmail_service = None
        self.auth_type = None  # 'imap' or 'gmail_oauth'
        self.email_address = None
        
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
            
            # Determine auth type
            if 'access_token' in self.config:
                self.auth_type = 'gmail_oauth'
                self.email_address = self.config.get('email')
            elif 'imap_server' in self.config:
                self.auth_type = 'imap'
                self.email_address = self.config.get('email')
            else:
                print("Unknown email configuration type")
                return False
                
            return True
        except Exception as e:
            print(f"Error loading email config: {e}")
            return False
    
    def connect(self) -> bool:
        """Establish connection based on auth type"""
        if self.auth_type == 'gmail_oauth':
            return self.connect_gmail_api()
        elif self.auth_type == 'imap':
            return self.connect_imap()
        return False

    def connect_gmail_api(self) -> bool:
        """Connect using Gmail API with OAuth credentials"""
        try:
            creds = Credentials(
                token=self.config.get('access_token'),
                refresh_token=self.config.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=os.getenv('GOOGLE_CLIENT_ID'),
                client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
                scopes=['https://www.googleapis.com/auth/gmail.readonly']
            )
            
            self.gmail_service = build('gmail', 'v1', credentials=creds)
            print("Successfully connected to Gmail API")
            return True
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error connecting to Gmail API: {e}")
            return False

    def connect_imap(self) -> bool:
        """Connect to IMAP server"""
        try:
            # Validate keys
            if not all(k in self.config for k in ['imap_server', 'password']):
                print("Missing IMAP credentials")
                return False

            # Safely handle port
            try:
                port = int(self.config.get('imap_port', 993))
            except (ValueError, TypeError):
                port = 993

            self.imap_server = imaplib.IMAP4_SSL(
                self.config['imap_server'],
                port
            )
            self.imap_server.login(
                self.email_address,
                self.config['password']
            )
            self.imap_server.select('INBOX')
            print("Successfully connected to IMAP")
            return True
        except Exception as e:
            print(f"Error connecting to IMAP: {e}")
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
        """Extract attachments from email message object"""
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
                    try:
                        filename = decode_header(filename)[0][0].decode(decode_header(filename)[0][1])
                    except:
                        pass
                
                # Get file content
                file_data = part.get_payload(decode=True)
                
                if file_data:
                    attachments.append((filename, file_data))
        
        return attachments
    
    def process_message_obj(self, msg, message_id: str, employee_emails: dict, check_timestamp: Optional[datetime] = None) -> int:
        """
        Process a standard python email.message.Message object.
        Reused by both IMAP and Gmail API (after conversion).
        """
        processed_count = 0
        try:
            # Check timestamp if provided (Double check for IMAP)
            if check_timestamp:
                email_date_str = msg.get('Date')
                if email_date_str:
                    try:
                        email_dt = email.utils.parsedate_to_datetime(email_date_str)
                        if email_dt.tzinfo is None:
                            email_dt = email_dt.replace(tzinfo=datetime.timezone.utc)
                        
                        # Ensure check_timestamp is timezone-aware
                        if check_timestamp.tzinfo is None:
                            check_timestamp = check_timestamp.replace(tzinfo=datetime.timezone.utc)

                        if email_dt <= check_timestamp:
                            # Skip if older than our watermark
                            return 0
                    except Exception as e:
                        print(f"Error parsing date {email_date_str}: {e}")
                        # Proceed if date parsing fails, safety dependent on query
            
            # Check if already processed
            if self.is_email_processed(message_id):
                return 0
            
            # Get sender
            from_header = msg.get('From', '')
            if '<' in from_header and '>' in from_header:
                sender_email = from_header.split('<')[1].split('>')[0].strip().lower()
            else:
                sender_email = from_header.strip().lower()
            
            # Check employee
            if sender_email not in employee_emails:
                # print(f"Skipping email from {sender_email} (not an employee)")
                return 0
            
            employee_id = employee_emails[sender_email]
            
            # Attachments
            attachments = self.extract_attachments(msg)
            if not attachments:
                return 0
            
            # Process Attachments
            for filename, file_data in attachments:
                is_valid, file_format = validate_file_format(filename)
                if not is_valid:
                    continue
                
                try:
                    file_path, unique_filename = save_uploaded_file(
                        file_content=file_data,
                        original_filename=filename,
                        employee_id=employee_id
                    )
                    
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
                    
                    self.mark_email_processed(message_id, employee_id, upload.id)
                    processed_count += 1
                    print(f"Processed {filename} from {sender_email}")
                    
                except Exception as e:
                    print(f"Error processing attachment {filename}: {e}")
                    self.db.rollback()
                    
        except Exception as e:
            print(f"Error processing message object {message_id}: {e}")
            
        return processed_count

    def monitor_inbox(self) -> dict:
        """Monitor inbox and process new emails based on last sync timestamp"""
        if not self.load_config():
            return {"success": False, "message": "Email configuration not loaded"}
        
        if not self.connect():
            return {"success": False, "message": "Failed to connect to email service"}
        
        try:
            # 1. Fetch Watermark (Start Time)
            integration = self.db.query(IntegrationConfig).filter(
                IntegrationConfig.type == IntegrationType.EMAIL
            ).first()
            
            now_utc = datetime.utcnow()
            
            if integration.last_sync:
                start_time = integration.last_sync
            else:
                # Default lookback if no last sync
                lookback_minutes = integration.sync_interval_minutes or 60
                start_time = now_utc - timedelta(minutes=lookback_minutes)
            
            print(f"Starting Email Sync. Looking for items after: {start_time}")
            
            employee_emails = self.get_employee_emails()
            if not employee_emails:
                return {"success": False, "message": "No active employees found"}
            
            processed_count = 0
            total_scanned = 0
            
            # --- GMAIL API STRATEGY ---
            if self.auth_type == 'gmail_oauth':
                # 'after' query expects seconds since epoch
                after_ts = int(start_time.timestamp())
                query = f"has:attachment after:{after_ts}"
                
                results = self.gmail_service.users().messages().list(
                    userId='me', q=query
                ).execute()
                
                messages = results.get('messages', [])
                total_scanned = len(messages)
                
                for msg_meta in messages:
                    msg_id = msg_meta['id']
                    # Fetch full raw message
                    full_msg = self.gmail_service.users().messages().get(
                        userId='me', id=msg_id, format='raw'
                    ).execute()
                    
                    # Decode and parse into python email object
                    msg_raw = base64.urlsafe_b64decode(full_msg['raw'])
                    mime_msg = email.message_from_bytes(msg_raw)
                    
                    # Reuse processing logic
                    processed_count += self.process_message_obj(
                        mime_msg, msg_id, employee_emails
                    )
            
            # --- IMAP STRATEGY ---
            else:
                # IMAP Search by Date (SINCE 01-Jan-202X) - Resolution is Day only
                date_str = start_time.strftime("%d-%b-%Y")
                typ, data = self.imap_server.search(None, f'(SINCE "{date_str}")')
                
                if typ == 'OK':
                    msg_ids = data[0].split()
                    total_scanned = len(msg_ids)
                    
                    for num in msg_ids:
                        typ, msg_data = self.imap_server.fetch(num, '(RFC822)')
                        if typ == 'OK':
                            raw_email = msg_data[0][1]
                            mime_msg = email.message_from_bytes(raw_email)
                            msg_id = mime_msg.get('Message-ID', f"imap-{num.decode()}")
                            
                            # Pass start_time to process_message_obj for strict timestamp filtering
                            # because IMAP SINCE is only day-granular
                            processed_count += self.process_message_obj(
                                mime_msg, msg_id, employee_emails, check_timestamp=start_time
                            )
                
                self.imap_server.close()
                self.imap_server.logout()

            # Update Watermark
            integration.last_sync = now_utc
            integration.sync_count = (integration.sync_count or 0) + processed_count
            integration.updated_at = now_utc
            self.db.commit()
            
            return {
                "success": True,
                "message": f"Processed {processed_count} attachments (Scanned {total_scanned}).",
                "processed_attachments": processed_count
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error monitoring inbox: {e}")
            return {"success": False, "message": str(e)}


def run_email_monitoring(db: Session) -> dict:
    """Run email monitoring service"""
    service = EmailMonitoringService(db)
    return service.monitor_inbox()

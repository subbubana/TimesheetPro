"""
Email IDLE service for real-time email notifications.
Uses IMAP IDLE to maintain a connection and receive instant notifications.
"""
import imaplib
import threading
import time
from typing import Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.email_service import EmailMonitoringService


class EmailIdleService:
    """Service for monitoring email using IMAP IDLE"""
    
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.imap_connection: Optional[imaplib.IMAP4_SSL] = None
        
    def idle_loop(self):
        """Main IDLE loop that maintains connection and processes emails"""
        while self.running:
            db = SessionLocal()
            try:
                # Create monitoring service
                email_service = EmailMonitoringService(db)
                
                # Load config and connect
                if not email_service.load_config():
                    print("Email config not loaded, waiting...")
                    time.sleep(60)
                    continue
                
                if not email_service.connect_to_inbox():
                    print("Failed to connect to inbox, retrying...")
                    time.sleep(60)
                    continue
                
                self.imap_connection = email_service.imap_server
                
                print("Email IDLE: Connected and monitoring...")
                
                # Enter IDLE mode
                while self.running:
                    try:
                        # Start IDLE
                        tag = self.imap_connection._new_tag().decode()
                        self.imap_connection.send(f'{tag} IDLE\r\n'.encode())
                        
                        # Wait for response (with timeout)
                        response = self.imap_connection.readline()
                        
                        if b'idling' in response.lower():
                            print("Email IDLE: Waiting for new emails...")
                            
                            # Wait for notification or timeout (29 minutes, IMAP spec is 30 min max)
                            self.imap_connection.socket().settimeout(29 * 60)
                            
                            try:
                                # Wait for EXISTS response (new email)
                                while self.running:
                                    line = self.imap_connection.readline()
                                    
                                    if not line:
                                        break
                                    
                                    if b'EXISTS' in line:
                                        print("Email IDLE: New email detected!")
                                        break
                                    
                                    if b'BYE' in line:
                                        print("Email IDLE: Server closed connection")
                                        break
                                
                            except Exception as e:
                                print(f"Email IDLE: Timeout or error: {e}")
                            
                            # Exit IDLE mode
                            self.imap_connection.send(b'DONE\r\n')
                            
                            # Process new emails
                            print("Email IDLE: Processing new emails...")
                            result = email_service.monitor_inbox()
                            print(f"Email IDLE: {result}")
                            
                        else:
                            print("Email IDLE: Server doesn't support IDLE, falling back to polling")
                            # Fallback to polling every 5 minutes
                            time.sleep(300)
                            result = email_service.monitor_inbox()
                            print(f"Email polling: {result}")
                        
                    except Exception as e:
                        print(f"Email IDLE error: {e}")
                        time.sleep(60)
                        break
                
                # Close connection
                if self.imap_connection:
                    try:
                        self.imap_connection.close()
                        self.imap_connection.logout()
                    except:
                        pass
                
            except Exception as e:
                print(f"Email IDLE loop error: {e}")
                time.sleep(60)
            finally:
                db.close()
    
    def start(self):
        """Start the IDLE monitoring service"""
        if self.running:
            print("Email IDLE already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self.idle_loop, daemon=True)
        self.thread.start()
        print("Email IDLE service started")
    
    def stop(self):
        """Stop the IDLE monitoring service"""
        if not self.running:
            print("Email IDLE not running")
            return
        
        self.running = False
        
        # Close IMAP connection to break out of IDLE
        if self.imap_connection:
            try:
                self.imap_connection.send(b'DONE\r\n')
                self.imap_connection.close()
                self.imap_connection.logout()
            except:
                pass
        
        if self.thread:
            self.thread.join(timeout=5)
        
        print("Email IDLE service stopped")
    
    def is_running(self) -> bool:
        """Check if service is running"""
        return self.running and self.thread and self.thread.is_alive()


# Global instance
email_idle_service = EmailIdleService()


def start_email_idle():
    """Start email IDLE service"""
    email_idle_service.start()


def stop_email_idle():
    """Stop email IDLE service"""
    email_idle_service.stop()


def get_email_idle_status() -> dict:
    """Get email IDLE service status"""
    return {
        "running": email_idle_service.is_running(),
        "method": "IMAP IDLE (real-time)"
    }

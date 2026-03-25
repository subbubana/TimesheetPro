from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import IntegrationType, IntegrationConfig
from app.services.email_service import EmailMonitoringService
from app.services.drive_service import DriveMonitoringService
from app.services.timesheet_processor import process_pending_uploads
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def sync_email_job():
    """Scheduled job to sync email timesheets"""
    logger.info("Starting scheduled Email sync...")
    db = SessionLocal()
    try:
        service = EmailMonitoringService(db)
        result = service.monitor_inbox()
        logger.info(f"Email sync completed: {result}")
    except Exception as e:
        logger.error(f"Email sync failed: {str(e)}")
    finally:
        db.close()

def sync_drive_job():
    """Scheduled job to sync Drive timesheets"""
    logger.info("Starting scheduled Drive sync...")
    db = SessionLocal()
    try:
        service = DriveMonitoringService(db)
        result = service.monitor_folder()
        logger.info(f"Drive sync completed: {result}")
    except Exception as e:
        logger.error(f"Drive sync failed: {str(e)}")
    finally:
        db.close()

def processing_job():
    """Scheduled job to process pending uploads with AI Agent"""
    logger.info("Starting AI Processing job...")
    process_pending_uploads()

def start_scheduler():
    """Initialize and start the scheduler with jobs from config"""
    
    # Master Sync Check (Fetches files)
    scheduler.add_job(
        check_and_run_syncs,
        trigger=IntervalTrigger(minutes=1),
        id='master_sync_check',
        name='Check if sync is needed',
        replace_existing=True
    )

    # Processing Job (Runs Agent) - Run frequently to pick up new files
    scheduler.add_job(
        processing_job,
        trigger=IntervalTrigger(seconds=30),
        id='ai_processing_job',
        name='Process pending uploads with AI',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started.")

def check_and_run_syncs():
    """Check DB config and run sync if interval has passed"""
    db = SessionLocal()
    try:
        from datetime import datetime, timedelta
        
        configs = db.query(IntegrationConfig).filter(IntegrationConfig.is_active == True).all()
        
        for config in configs:
            # Check interval
            interval = config.sync_interval_minutes or 60
            last_run = config.last_sync
            
            should_run = False
            if not last_run:
                should_run = True
            else:
                next_run = last_run + timedelta(minutes=interval)
                if datetime.utcnow() >= next_run:
                    should_run = True
            
            if should_run:
                if config.type == IntegrationType.EMAIL:
                    sync_email_job()
                elif config.type == IntegrationType.DRIVE:
                    sync_drive_job()
                    
    except Exception as e:
        logger.error(f"Master sync check failed: {str(e)}")
    finally:
        db.close()

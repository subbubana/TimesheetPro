from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import IntegrationType, IntegrationConfig
from app.services.email_service import EmailMonitoringService
from app.services.drive_service import DriveMonitoringService
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
        service = EmailMonitoringService()
        result = service.check_inbox(db=db)
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
        service = DriveMonitoringService()
        result = service.monitor_folder(db=db)
        logger.info(f"Drive sync completed: {result}")
    except Exception as e:
        logger.error(f"Drive sync failed: {str(e)}")
    finally:
        db.close()

def start_scheduler():
    """Initialize and start the scheduler with jobs from config"""
    # In a real app, we might load intervals from DB dynamically. 
    # For now, we set a default or just use the DB value during the job execution?
    # Actually, better to simply schedule them to run every X minutes and let the job logic check if it should proceed?
    # OR, we restart the scheduler when config changes. 
    # For simplicity required: We will run a check every 5 minutes, but the Logic inside handles "since last time".
    
    # However, user asked to "set the timer too for the cron job".
    # So we should ideally read from DB. But configuring dynamic jobs is complex.
    # Simplest: Run every 1 minute, check if (now - last_sync) > sync_interval.
    
    # User said: "set the tmier too for the cron job" -> Configurable.
    # Let's run a "Master Job" every minute that checks if it's time to run specific syncs.
    
    scheduler.add_job(
        check_and_run_syncs,
        trigger=IntervalTrigger(minutes=1),
        id='master_sync_check',
        name='Check if sync is needed',
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

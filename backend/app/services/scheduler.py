"""
Background scheduler for running email and Drive monitoring jobs.
Uses APScheduler to run monitoring tasks at regular intervals.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.email_service import run_email_monitoring
from app.services.drive_service import run_drive_monitoring


# Global scheduler instance
scheduler = BackgroundScheduler()


def email_monitoring_job():
    """Job to run email monitoring"""
    print(f"[{datetime.now()}] Running email monitoring job...")
    db = SessionLocal()
    try:
        result = run_email_monitoring(db)
        print(f"Email monitoring result: {result}")
    except Exception as e:
        print(f"Error in email monitoring job: {e}")
    finally:
        db.close()


def drive_monitoring_job():
    """Job to run Drive monitoring"""
    print(f"[{datetime.now()}] Running Drive monitoring job...")
    db = SessionLocal()
    try:
        result = run_drive_monitoring(db)
        print(f"Drive monitoring result: {result}")
    except Exception as e:
        print(f"Error in Drive monitoring job: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    if not scheduler.running:
        # Add email monitoring job (every 10 minutes)
        scheduler.add_job(
            email_monitoring_job,
            trigger=IntervalTrigger(minutes=10),
            id='email_monitoring',
            name='Email Monitoring Job',
            replace_existing=True
        )
        
        # Add Drive monitoring job (every 10 minutes)
        scheduler.add_job(
            drive_monitoring_job,
            trigger=IntervalTrigger(minutes=10),
            id='drive_monitoring',
            name='Drive Monitoring Job',
            replace_existing=True
        )
        
        scheduler.start()
        print("Background scheduler started")
        print("Email monitoring: every 10 minutes")
        print("Drive monitoring: every 10 minutes")


def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("Background scheduler stopped")


def get_scheduler_status():
    """Get status of scheduled jobs"""
    if not scheduler.running:
        return {"running": False, "jobs": []}
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        })
    
    return {
        "running": True,
        "jobs": jobs
    }

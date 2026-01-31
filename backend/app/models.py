from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class SubmissionFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class TimesheetStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    FINANCE = "finance"
    ADMIN = "admin"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Only for admin/manager/finance users
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.EMPLOYEE)
    submission_frequency = Column(SQLEnum(SubmissionFrequency, values_callable=lambda x: [e.value for e in x]), nullable=False, default=SubmissionFrequency.WEEKLY)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    week_start_day = Column(Integer, default=1)
    pay_rate = Column(Float, nullable=True)  # Employee's pay rate
    overtime_allowed = Column(Boolean, default=True)  # Whether overtime is allowed
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    manager = relationship("Employee", remote_side=[id], backref="subordinates")
    client_assignments = relationship("EmployeeClientAssignment", back_populates="employee", cascade="all, delete-orphan")
    timesheets = relationship("Timesheet", back_populates="employee", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    contact_email = Column(String, nullable=True)
    billing_email = Column(String, nullable=True)
    bill_rate = Column(Float, nullable=True)  # Client bill rate per hour
    week_start_day = Column(Integer, default=1)  # 0=Sunday to 6=Saturday
    weekend_days = Column(String, default="[0, 6]")  # JSON array of non-working days (0=Sunday, 6=Saturday)
    overtime_threshold_daily = Column(Float, default=8.0)
    overtime_threshold_weekly = Column(Float, default=40.0)
    overtime_multiplier = Column(Float, default=1.5)
    email_inbox_path = Column(String, nullable=True)
    drive_folder_path = Column(String, nullable=True)
    default_submission_frequency = Column(SQLEnum(SubmissionFrequency, values_callable=lambda x: [e.value for e in x]), default=SubmissionFrequency.WEEKLY)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee_assignments = relationship("EmployeeClientAssignment", back_populates="client", cascade="all, delete-orphan")
    business_calendars = relationship("BusinessCalendar", back_populates="client", cascade="all, delete-orphan")
    timesheets = relationship("Timesheet", back_populates="client", cascade="all, delete-orphan")


class EmployeeClientAssignment(Base):
    """Many-to-many relationship between Employee and Client with additional fields"""
    __tablename__ = "employee_client_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    pay_rate = Column(Float, nullable=True)  # Override employee's default pay rate for this client
    overtime_allowed = Column(Boolean, default=True)  # Override for this specific assignment
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="client_assignments")
    client = relationship("Client", back_populates="employee_assignments")


class BusinessCalendar(Base):
    """Stores non-working dates (holidays) for a client for a specific year"""
    __tablename__ = "business_calendars"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    year = Column(Integer, nullable=False)  # The year this calendar is for
    name = Column(String, nullable=True)  # e.g., "2026 Holiday Calendar"
    non_working_dates = Column(Text, nullable=True)  # JSON array of dates ["2026-01-01", "2026-12-25", ...]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="business_calendars")


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(SQLEnum(TimesheetStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=TimesheetStatus.DRAFT)
    total_hours = Column(Float, default=0.0)
    total_overtime = Column(Float, default=0.0)
    submission_date = Column(DateTime, nullable=True)
    file_path = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="timesheets")
    client = relationship("Client", back_populates="timesheets")
    details = relationship("TimesheetDetail", back_populates="timesheet", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="timesheet", cascade="all, delete-orphan")


class TimesheetDetail(Base):
    __tablename__ = "timesheet_details"

    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    overtime_hours = Column(Float, default=0.0)
    is_holiday = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    timesheet = relationship("Timesheet", back_populates="details")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    status = Column(SQLEnum(ApprovalStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ApprovalStatus.PENDING)
    approval_date = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    timesheet = relationship("Timesheet", back_populates="approvals")
    approver = relationship("Employee")


class Calendar(Base):
    __tablename__ = "calendars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    holidays = relationship("Holiday", back_populates="calendar", cascade="all, delete-orphan")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    is_recurring = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calendar = relationship("Calendar", back_populates="holidays")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    notification_type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SQLEnum(NotificationStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=NotificationStatus.PENDING)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")


class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    changes = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")

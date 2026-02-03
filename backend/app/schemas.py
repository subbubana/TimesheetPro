from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models import (
    SubmissionFrequency, TimesheetStatus, ApprovalStatus, UserRole, 
    NotificationStatus, UploadSource, UploadStatus, IntegrationType
)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class EmployeeBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.EMPLOYEE
    submission_frequency: SubmissionFrequency = SubmissionFrequency.WEEKLY
    manager_id: Optional[int] = None
    week_start_day: int = 1
    pay_rate: Optional[float] = None
    overtime_allowed: bool = True


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeCreateByAdmin(BaseModel):
    """Schema for admin creating employees - no password required"""
    email: EmailStr
    first_name: str
    last_name: str
    manager_id: Optional[int] = None
    week_start_day: int = 1
    pay_rate: Optional[float] = None
    overtime_allowed: bool = True
    # Client assignments will be handled separately
    client_ids: List[int] = []  # List of client IDs to assign


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    submission_frequency: Optional[SubmissionFrequency] = None
    manager_id: Optional[int] = None
    week_start_day: Optional[int] = None
    pay_rate: Optional[float] = None
    overtime_allowed: Optional[bool] = None
    is_active: Optional[bool] = None


class EmployeeClientAssignmentBase(BaseModel):
    employee_id: int
    client_id: int
    pay_rate: Optional[float] = None
    overtime_allowed: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class EmployeeClientAssignmentCreate(BaseModel):
    client_id: int
    pay_rate: Optional[float] = None
    overtime_allowed: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class EmployeeClientAssignmentResponse(EmployeeClientAssignmentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmployeeResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    submission_frequency: SubmissionFrequency
    manager_id: Optional[int] = None
    week_start_day: int
    pay_rate: Optional[float] = None
    overtime_allowed: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    client_assignments: List[EmployeeClientAssignmentResponse] = []

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ClientBase(BaseModel):
    name: str
    code: str
    contact_email: Optional[str] = None
    billing_email: Optional[str] = None
    bill_rate: Optional[float] = None
    week_start_day: int = 1
    weekend_days: str = "[0, 6]"  # JSON array of non-working days
    overtime_threshold_daily: float = 8.0
    overtime_threshold_weekly: float = 40.0
    overtime_multiplier: float = 1.5
    email_inbox_path: Optional[str] = None
    drive_folder_path: Optional[str] = None
    default_submission_frequency: SubmissionFrequency = SubmissionFrequency.WEEKLY


class ClientCreate(ClientBase):
    # Business calendar dates for the current year
    non_working_dates: List[str] = []  # List of dates in "YYYY-MM-DD" format


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_email: Optional[str] = None
    billing_email: Optional[str] = None
    bill_rate: Optional[float] = None
    week_start_day: Optional[int] = None
    weekend_days: Optional[str] = None
    overtime_threshold_daily: Optional[float] = None
    overtime_threshold_weekly: Optional[float] = None
    overtime_multiplier: Optional[float] = None
    email_inbox_path: Optional[str] = None
    drive_folder_path: Optional[str] = None
    default_submission_frequency: Optional[SubmissionFrequency] = None
    is_active: Optional[bool] = None
    non_working_dates: Optional[List[str]] = None  # Logic to update current year's calendar


class ClientResponse(ClientBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    non_working_dates: List[str] = []  # Virtual field from business calendar

    class Config:
        from_attributes = True


class BusinessCalendarBase(BaseModel):
    client_id: int
    year: int
    name: Optional[str] = None
    non_working_dates: Optional[str] = None  # JSON array of dates


class BusinessCalendarCreate(BaseModel):
    year: int
    name: Optional[str] = None
    non_working_dates: List[str] = []  # List of dates in "YYYY-MM-DD" format


class BusinessCalendarUpdate(BaseModel):
    name: Optional[str] = None
    non_working_dates: Optional[List[str]] = None
    is_active: Optional[bool] = None


class BusinessCalendarResponse(BaseModel):
    id: int
    client_id: int
    year: int
    name: Optional[str] = None
    non_working_dates: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimesheetDetailBase(BaseModel):
    work_date: date
    hours: float = Field(..., ge=0, le=24)
    overtime_hours: float = Field(default=0.0, ge=0)
    is_holiday: bool = False
    description: Optional[str] = None


class TimesheetDetailCreate(TimesheetDetailBase):
    pass


class TimesheetDetailResponse(TimesheetDetailBase):
    id: int
    timesheet_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimesheetBase(BaseModel):
    client_id: int
    period_start: date
    period_end: date
    notes: Optional[str] = None


class TimesheetCreate(TimesheetBase):
    details: List[TimesheetDetailCreate] = []


class TimesheetUpdate(BaseModel):
    status: Optional[TimesheetStatus] = None
    notes: Optional[str] = None


class TimesheetResponse(TimesheetBase):
    id: int
    employee_id: int
    status: TimesheetStatus
    total_hours: float
    total_overtime: float
    submission_date: Optional[datetime] = None
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    details: List[TimesheetDetailResponse] = []

    class Config:
        from_attributes = True


class ApprovalBase(BaseModel):
    comments: Optional[str] = None


class ApprovalCreate(ApprovalBase):
    timesheet_id: int


class ApprovalUpdate(BaseModel):
    status: ApprovalStatus
    comments: Optional[str] = None


class ApprovalResponse(ApprovalBase):
    id: int
    timesheet_id: int
    approver_id: int
    status: ApprovalStatus
    approval_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalendarBase(BaseModel):
    name: str
    description: Optional[str] = None


class CalendarCreate(CalendarBase):
    pass


class CalendarUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CalendarResponse(CalendarBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HolidayBase(BaseModel):
    calendar_id: int
    name: str
    date: date
    is_recurring: bool = False


class HolidayCreate(HolidayBase):
    pass


class HolidayResponse(HolidayBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationBase(BaseModel):
    notification_type: str
    subject: str
    message: str


class NotificationCreate(NotificationBase):
    employee_id: int


class NotificationResponse(NotificationBase):
    id: int
    employee_id: int
    status: NotificationStatus
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConfigurationBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class ConfigurationCreate(ConfigurationBase):
    pass


class ConfigurationUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ConfigurationResponse(ConfigurationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    employee_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    changes: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Timesheet Upload Schemas
class TimesheetUploadCreate(BaseModel):
    employee_id: int
    file_format: str  # pdf, jpg, csv
    source: UploadSource = UploadSource.MANUAL


class TimesheetUploadResponse(BaseModel):
    id: int
    employee_id: int
    file_path: str
    file_name: str
    file_format: str
    source: UploadSource
    status: UploadStatus
    uploaded_by: Optional[int] = None
    upload_metadata: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Integration Config Schemas
class EmailConfigCreate(BaseModel):
    imap_server: str
    imap_port: int = 993
    email: EmailStr
    password: str  # Will be encrypted before storage


class EmailConfigResponse(BaseModel):
    id: int
    type: IntegrationType
    is_active: bool
    last_sync: Optional[datetime] = None
    sync_count: int
    # config_data is not exposed for security
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DriveConfigCreate(BaseModel):
    oauth_credentials: str  # JSON string with OAuth tokens
    folder_id: str


class DriveConfigResponse(BaseModel):
    id: int
    type: IntegrationType
    is_active: bool
    last_sync: Optional[datetime] = None
    sync_count: int
    # config_data is not exposed for security
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IntegrationConfigResponse(BaseModel):
    """Generic integration config response"""
    id: int
    type: IntegrationType
    is_active: bool
    last_sync: Optional[datetime] = None
    sync_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

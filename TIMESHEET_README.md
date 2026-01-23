# Timesheet Management System - Comprehensive Requirements

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core Requirements](#core-requirements)
3. [Configuration Management](#configuration-management)
4. [Database Schema](#database-schema)
5. [UI Layout (ASCII)](#ui-layout-ascii)
6. [Business Logic & Rules](#business-logic--rules)
7. [Notification System](#notification-system)
8. [Output & Reporting](#output--reporting)
9. [Integration Points](#integration-points)
10. [Security & Access Control](#security--access-control)
11. [LangGraph Agent Workflow](#langgraph-agent-workflow)

---

## Project Overview

### Purpose
A generic timesheet management system designed to collect, validate, approve, and consolidate employee timesheets from multiple channels (Email, Google Drive, Network Drives) with configurable rules and automated notifications.

### Key Objectives
- **Flexibility**: Support multiple submission frequencies (weekly, bi-weekly, monthly)
- **Automation**: Automated reminders, validations, and notifications
- **Consolidation**: Generate unified reports for invoicing and accounting integration
- **Configurability**: Make the system adaptable to any customer without code changes
- **Multi-format Support**: Handle Excel, PDF, and other formats

---

## Core Requirements

### 1. Timesheet Collection Channels

#### 1.1 Email Inbox
- **Description**: Dedicated email inbox for timesheet submissions
- **Example**: timesheets@tbs-team.com
- **Format Support**:
  - Excel (.xlsx, .xls)
  - PDF (.pdf)
  - Scanned documents (via OCR - future enhancement)
- **Processing**:
  - Auto-fetch emails at configurable intervals
  - Extract attachments
  - Parse employee identifier from email/subject/filename
  - Log receipt timestamp

#### 1.2 Network/Google Drive
- **Description**: Shared folder structure for timesheet uploads
- **Folder Structure**:
  ```
  /Timesheets/
    ├── /2026/
    │   ├── /January/
    │   │   ├── /Week1/
    │   │   ├── /Week2/
    │   │   └── ...
    │   └── /February/
    └── /Pending_Review/
  ```
- **Processing**:
  - Periodic scan for new files
  - File naming convention: `{EmployeeID}_{YYYY-MM-DD}_{YYYY-MM-DD}.{ext}`
  - Move to processed folder after extraction

---

### 2. Submission Frequency (Configurable)

#### 2.1 Frequency Types
- **Weekly**: Submit every week
- **Bi-Weekly**: Submit every 2 weeks
- **Monthly**: Submit once per month

#### 2.2 Timesheet Period Rules
- All timesheets are broken down into **weekly periods** internally
- Monthly submissions cover multiple weeks
- Week boundaries may not align with month boundaries

#### 2.3 Month Boundary Handling
**Example Scenario**:
- Month starts: Wednesday, Jan 3rd
- Week end configured: Sunday
- First week of month: Wed (Jan 3) - Sun (Jan 7)
- Last week of month: Mon (Jan 29) - Tue (Jan 31) if month ends on Tuesday

**Implementation**:
```
IF month_start_day != week_start_day THEN
  First partial week = month_start_day TO configured_week_end_day
END IF

IF month_end_day != week_end_day THEN
  Last partial week = week_start_day TO month_end_day
END IF
```

---

### 3. Week Configuration (Configurable)

#### 3.1 Week Start/End Options
- **Option 1**: Sunday (start) - Saturday (end)
- **Option 2**: Monday (start) - Sunday (end)
- **Custom**: Any day can be configured as week start

#### 3.2 Configuration Storage
```json
{
  "week_config": {
    "start_day": "Monday",
    "end_day": "Sunday"
  }
}
```

---

### 4. Holiday/Business Calendar (Configurable)

#### 4.1 Calendar Management
- **Purpose**: Define non-working days for validation
- **Types**:
  - Public Holidays
  - Company Holidays
  - Client-specific holidays
  - Custom blackout dates

#### 4.2 Calendar Configuration
```json
{
  "calendars": [
    {
      "calendar_id": "US_FEDERAL_2026",
      "name": "US Federal Holidays 2026",
      "holidays": [
        {"date": "2026-01-01", "name": "New Year's Day"},
        {"date": "2026-07-04", "name": "Independence Day"},
        {"date": "2026-12-25", "name": "Christmas Day"}
      ]
    }
  ]
}
```

#### 4.3 Validation Rules
- Flag hours logged on holidays
- Allow override with approval
- Support multiple calendars per employee (e.g., US + Client holidays)

---

### 5. Overtime Configuration (Configurable per Employee)

#### 5.1 Overtime Rules
- **Allowed**: Employee can log >8 hours/day
- **Not Allowed**: System flags if >8 hours/day logged
- **Threshold**: Configurable (default: 8 hours/day, 40 hours/week)

#### 5.2 Configuration Example
```json
{
  "employee_id": "EMP001",
  "overtime_allowed": true,
  "daily_threshold": 8,
  "weekly_threshold": 40
}
```

---

### 6. Multi-Format Timesheet Support

#### 6.1 Supported Formats
- **Excel**: .xlsx, .xls (with template mapping)
- **PDF**: Extract via OCR or structured PDF parsing
- **CSV**: Direct import

#### 6.2 Template Mapping
- Define cell/field mappings per template
- Support multiple templates per client/employee
- Flexible field extraction (regex patterns, cell coordinates)

#### 6.3 Data Extraction Fields
- Employee Name/ID
- Week/Period
- Daily hours breakdown
- Client/Project
- Approver signature/name
- Comments/notes

---

### 7. Automated Reminder System (Configurable)

#### 7.1 Reminder Triggers
- **Trigger**: Timesheet not received by due date
- **Due Date Calculation**:
  ```
  Due Date = Period_End_Date + Grace_Period_Days
  ```

#### 7.2 Reminder Configuration
```json
{
  "reminder_config": {
    "enabled": true,
    "grace_period_days": 2,
    "reminder_intervals": [3, 7, 14],
    "escalation_enabled": true,
    "escalation_to": "manager@company.com"
  }
}
```

#### 7.3 Reminder Email Template
```
Subject: Reminder: Timesheet Submission Overdue - Week of {week_start}

Dear {employee_name},

Your timesheet for the week of {week_start} to {week_end} has not been received.

Please submit your timesheet at your earliest convenience.

Due Date: {due_date}
Days Overdue: {days_overdue}

Thank you.
```

---

### 8. Employee Database

#### 8.1 Required Fields
- Employee ID (unique)
- Full Name
- Email Address
- Submission Frequency (Weekly/Bi-Weekly/Monthly)
- Week Start/End Config
- Overtime Allowed (Y/N)
- Calendar Assignment
- Client/Project Assignment
- Manager/Approver
- Status (Active/Inactive)

---

## Database Schema

### Entity Relationship Diagram (Text Format)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   EMPLOYEES     │───────│   TIMESHEETS     │───────│  TIMESHEET_     │
│                 │ 1   * │                  │ 1   * │  DETAILS        │
└─────────────────┘       └──────────────────┘       └─────────────────┘
        │                          │
        │ 1                        │ *
        │                          │
        │                          │
        │                  ┌───────────────┐
        │                  │  APPROVALS    │
        │                  └───────────────┘
        │
        │ *
        │
┌─────────────────┐
│   CLIENTS       │
└─────────────────┘

┌─────────────────┐       ┌──────────────────┐
│   CALENDARS     │───────│  HOLIDAYS        │
│                 │ 1   * │                  │
└─────────────────┘       └──────────────────┘

┌─────────────────┐
│ NOTIFICATIONS   │
└─────────────────┘

┌─────────────────┐
│ CONFIGURATIONS  │
└─────────────────┘
```

### Table Definitions

#### 1. EMPLOYEES
```sql
CREATE TABLE employees (
    employee_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    client_id INT,
    submission_frequency ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY') DEFAULT 'WEEKLY',
    overtime_allowed BOOLEAN DEFAULT FALSE,
    daily_hour_threshold DECIMAL(4,2) DEFAULT 8.00,
    weekly_hour_threshold DECIMAL(5,2) DEFAULT 40.00,
    calendar_id INT,
    manager_id VARCHAR(20),
    approver_email VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id),
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

CREATE INDEX idx_emp_status ON employees(status);
CREATE INDEX idx_emp_client ON employees(client_id);
```

#### 2. CLIENTS
```sql
CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_code VARCHAR(20) UNIQUE,
    contact_email VARCHAR(100),
    billing_email VARCHAR(100),
    invoice_frequency ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY') DEFAULT 'MONTHLY',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. TIMESHEETS
```sql
CREATE TABLE timesheets (
    timesheet_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    client_id INT,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    submission_date TIMESTAMP,
    source_channel ENUM('EMAIL', 'GOOGLE_DRIVE', 'NETWORK', 'MANUAL') DEFAULT 'EMAIL',
    file_path VARCHAR(500),
    file_type VARCHAR(10),
    status ENUM('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FLAGGED') DEFAULT 'PENDING',
    total_hours DECIMAL(6,2),
    flagged_reason TEXT,
    approved_by VARCHAR(100),
    approved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    UNIQUE KEY unique_timesheet (employee_id, period_start_date, period_end_date)
);

CREATE INDEX idx_ts_employee ON timesheets(employee_id);
CREATE INDEX idx_ts_period ON timesheets(period_start_date, period_end_date);
CREATE INDEX idx_ts_status ON timesheets(status);
```

#### 4. TIMESHEET_DETAILS
```sql
CREATE TABLE timesheet_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    timesheet_id INT NOT NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL,
    project_code VARCHAR(50),
    task_description TEXT,
    is_overtime BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    validation_status ENUM('VALID', 'FLAGGED', 'OVERRIDE') DEFAULT 'VALID',
    validation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(timesheet_id) ON DELETE CASCADE
);

CREATE INDEX idx_tsd_timesheet ON timesheet_details(timesheet_id);
CREATE INDEX idx_tsd_date ON timesheet_details(work_date);
```

#### 5. APPROVALS
```sql
CREATE TABLE approvals (
    approval_id INT AUTO_INCREMENT PRIMARY KEY,
    timesheet_id INT NOT NULL,
    approver_email VARCHAR(100) NOT NULL,
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approval_date TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(timesheet_id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_timesheet ON approvals(timesheet_id);
CREATE INDEX idx_approval_status ON approvals(approval_status);
```

#### 6. CALENDARS
```sql
CREATE TABLE calendars (
    calendar_id INT AUTO_INCREMENT PRIMARY KEY,
    calendar_name VARCHAR(100) NOT NULL,
    calendar_code VARCHAR(20) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 7. HOLIDAYS
```sql
CREATE TABLE holidays (
    holiday_id INT AUTO_INCREMENT PRIMARY KEY,
    calendar_id INT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id) ON DELETE CASCADE
);

CREATE INDEX idx_holiday_calendar ON holidays(calendar_id);
CREATE INDEX idx_holiday_date ON holidays(holiday_date);
```

#### 8. NOTIFICATIONS
```sql
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM('REMINDER', 'APPROVAL_PENDING', 'HOURS_FLAGGED', 'INVOICE_READY') NOT NULL,
    employee_id VARCHAR(20),
    timesheet_id INT,
    recipient_email VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT,
    sent_date TIMESTAMP,
    status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(timesheet_id)
);

CREATE INDEX idx_notif_status ON notifications(status);
CREATE INDEX idx_notif_type ON notifications(notification_type);
```

#### 9. CONFIGURATIONS
```sql
CREATE TABLE configurations (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample configuration entries
INSERT INTO configurations (config_key, config_value, config_type, description) VALUES
('week_start_day', 'Monday', 'STRING', 'Week start day (Monday/Sunday)'),
('week_end_day', 'Sunday', 'STRING', 'Week end day'),
('reminder_enabled', 'true', 'BOOLEAN', 'Enable automated reminders'),
('reminder_grace_days', '2', 'NUMBER', 'Days after period end before first reminder'),
('reminder_intervals', '[3, 7, 14]', 'JSON', 'Days between reminder emails'),
('default_daily_hours', '8', 'NUMBER', 'Standard daily hours'),
('email_inbox', 'timesheets@tbs-team.com', 'STRING', 'Timesheet email inbox');
```

#### 10. AUDIT_LOG
```sql
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50),
    record_id INT,
    action ENUM('INSERT', 'UPDATE', 'DELETE'),
    old_values TEXT,
    new_values TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_date ON audit_log(changed_at);
```

---

## UI Layout (ASCII)

### 1. Dashboard Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  TIMESHEET MANAGEMENT SYSTEM                        [User: Admin] [Logout]     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  DASHBOARD - Week of Jan 15, 2026 - Jan 21, 2026                              │
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                     │
│  │  SUBMISSION STATUS       │  │  PENDING APPROVALS      │                     │
│  │                          │  │                          │                     │
│  │  ● Received:    45/50    │  │  Awaiting Review:   12  │                     │
│  │  ● Pending:      5       │  │  Flagged:            3  │                     │
│  │  ● Approved:    38       │  │  Rejected:           1  │                     │
│  │  ● Overdue:      2       │  │                          │                     │
│  └─────────────────────────┘  └─────────────────────────┘                     │
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                     │
│  │  ALERTS & NOTIFICATIONS  │  │  MONTHLY SUMMARY        │                     │
│  │                          │  │                          │                     │
│  │  🔴 2 Overdue           │  │  Total Hours: 1,840     │                     │
│  │  🟡 3 Flagged Hours     │  │  Employees:   50        │                     │
│  │  🟢 Invoice Ready       │  │  Clients:     5         │                     │
│  │                          │  │  Avg Hours:   36.8      │                     │
│  └─────────────────────────┘  └─────────────────────────┘                     │
│                                                                                 │
│  RECENT ACTIVITY                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ Time       │ Employee      │ Action              │ Status                │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ 10:23 AM   │ John Smith    │ Timesheet Submitted │ ✓ Approved            │ │
│  │ 09:45 AM   │ Jane Doe      │ Timesheet Submitted │ ⚠ Flagged (Holiday)   │ │
│  │ 09:12 AM   │ Bob Johnson   │ Timesheet Submitted │ ⏳ Pending Approval   │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [View All Timesheets] [Generate Report] [Configure Settings]                 │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Employee List Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  EMPLOYEE MANAGEMENT                                     [+ Add Employee]       │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Filter: [All ▼] [Client: All ▼] [Status: Active ▼]        Search: [______]  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ ID     │ Name           │ Client      │ Frequency │ Overtime │ Status   │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ EMP001 │ John Smith     │ Acme Corp   │ Weekly    │ ✓ Yes    │ Active   │ │
│  │ EMP002 │ Jane Doe       │ TechCo      │ Bi-Weekly │ ✗ No     │ Active   │ │
│  │ EMP003 │ Bob Johnson    │ Acme Corp   │ Monthly   │ ✓ Yes    │ Active   │ │
│  │ EMP004 │ Alice Brown    │ GlobalInc   │ Weekly    │ ✗ No     │ Inactive │ │
│  │ EMP005 │ Charlie Davis  │ TechCo      │ Weekly    │ ✓ Yes    │ Active   │ │
│  │                                                                            │ │
│  │                                                      [1] [2] [3] ... [10]  │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Edit] [Delete] [View Timesheets] [Send Reminder]                            │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Timesheet Submission/Review Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  TIMESHEET DETAILS - EMP001: John Smith                                        │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Employee: John Smith (EMP001)          Client: Acme Corp                      │
│  Period: Jan 15, 2026 - Jan 21, 2026    Submitted: Jan 22, 2026 10:23 AM      │
│  Status: ⏳ Pending Approval             Source: Email                         │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ Date       │ Day │ Hours │ Project     │ Description        │ Status     │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ 2026-01-15 │ Mon │  8.0  │ PROJ-001    │ Backend API Dev    │ ✓ Valid    │ │
│  │ 2026-01-16 │ Tue │  8.0  │ PROJ-001    │ Database Migration │ ✓ Valid    │ │
│  │ 2026-01-17 │ Wed │  9.5  │ PROJ-002    │ Client Meeting     │ ⚠ Overtime │ │
│  │ 2026-01-18 │ Thu │  8.0  │ PROJ-001    │ Testing & QA       │ ✓ Valid    │ │
│  │ 2026-01-19 │ Fri │  0.0  │ -           │ -                  │ ✓ Valid    │ │
│  │ 2026-01-20 │ Sat │  4.0  │ PROJ-003    │ Emergency Fix      │ ⚠ Weekend  │ │
│  │ 2026-01-21 │ Sun │  0.0  │ -           │ -                  │ ✓ Valid    │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ TOTAL HOURS:              37.5                                           │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Validation Flags:                                                             │
│  ⚠ Day 3 (Jan 17): Overtime detected (9.5 hours > 8.0 threshold)              │
│  ⚠ Day 6 (Jan 20): Weekend work detected                                      │
│                                                                                 │
│  Approver Comments: ┌────────────────────────────────────────────────────┐    │
│                     │                                                     │    │
│                     │                                                     │    │
│                     └────────────────────────────────────────────────────┘    │
│                                                                                 │
│  [✓ Approve] [✗ Reject] [⚠ Request Correction] [💾 Save Draft] [📎 View File]│
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Configuration Management Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  SYSTEM CONFIGURATION                                                           │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─ GENERAL SETTINGS ────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Week Configuration:                                                        ││
│  │    Week Start Day:  [Monday ▼]                                             ││
│  │    Week End Day:    [Sunday ▼]                                             ││
│  │                                                                             ││
│  │  Standard Hours:                                                            ││
│  │    Daily Threshold:  [8.0  ] hours                                         ││
│  │    Weekly Threshold: [40.0 ] hours                                         ││
│  │                                                                             ││
│  │  Email Configuration:                                                       ││
│  │    Inbox Address:    [timesheets@tbs-team.com          ]                   ││
│  │    Polling Interval: [15] minutes                                          ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ REMINDER SETTINGS ────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Enable Reminders:       [✓] Yes  [ ] No                                   ││
│  │  Grace Period (days):    [2 ]                                              ││
│  │  Reminder Intervals:     [3, 7, 14] (comma-separated days)                 ││
│  │  Enable Escalation:      [✓] Yes  [ ] No                                   ││
│  │  Escalation Recipients:  [manager@company.com           ]                  ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ VALIDATION RULES ─────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Flag Holiday Work:      [✓] Yes  [ ] No                                   ││
│  │  Flag Weekend Work:      [✓] Yes  [ ] No                                   ││
│  │  Require Approval:       [✓] Always  [ ] Only Flagged  [ ] Never           ││
│  │  Auto-Approve Threshold: [40] hours (0 = disabled)                         ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ NOTIFICATION SETTINGS ────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Notify on Submission:   [✓] Yes  [ ] No                                   ││
│  │  Notify on Approval:     [✓] Yes  [ ] No                                   ││
│  │  Notify on Flag:         [✓] Yes  [ ] No                                   ││
│  │  Invoice Ready Alert:    [accounts@company.com          ]                  ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  [💾 Save Configuration] [↺ Reset to Defaults] [Cancel]                       │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Consolidated Report Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  CONSOLIDATED TIMESHEET REPORT                                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Period: [Jan 2026 ▼]  Client: [All Clients ▼]  Status: [Approved ▼]         │
│                                                                                 │
│  [📊 Export to Excel] [📄 Export to PDF] [💾 Export to CSV] [🔄 Refresh]      │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │Employee  │Client   │Week         │ M │ T │ W │ T │ F │ S │ S │Total│Appr││
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │J. Smith  │Acme     │01/15-01/21  │ 8 │ 8 │9.5│ 8 │ 0 │ 4 │ 0 │37.5 │Yes ││
│  │          │         │01/22-01/28  │ 8 │ 8 │ 8 │ 8 │ 8 │ 0 │ 0 │40.0 │Yes ││
│  │          │         │01/29-01/31  │ 8 │ 8 │ 8 │ - │ - │ - │ - │24.0 │Yes ││
│  │          │         │                                    Month Total: 101.5││
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │J. Doe    │TechCo   │01/15-01/21  │ 8 │ 8 │ 8 │ 8 │ 8 │ 0 │ 0 │40.0 │Yes ││
│  │          │         │01/22-01/28  │ 8 │ 8 │ 8 │ 8 │ 8 │ 0 │ 0 │40.0 │Pend││
│  │          │         │01/29-01/31  │ 8 │ 8 │ 8 │ - │ - │ - │ - │24.0 │No  ││
│  │          │         │                                    Month Total: 104.0││
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │B. Johnson│Acme     │01/01-01/31  │ - │ - │ - │ - │ - │ - │ - │160.0│Yes ││
│  │          │         │                                    Month Total: 160.0││
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  SUMMARY:                                                                       │
│    Total Employees: 50                                                         │
│    Total Hours:     2,040                                                      │
│    Approved Hours:  1,920                                                      │
│    Pending Hours:   120                                                        │
│    Billable Hours:  1,920 × $50/hr = $96,000                                  │
│                                                                                 │
│  [Generate Invoice] [Send to Accounting] [View Details]                       │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 6. Calendar Management Screen

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  HOLIDAY CALENDAR MANAGEMENT                               [+ Add Calendar]    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Active Calendars:                                                             │
│                                                                                 │
│  ┌─ US Federal Holidays 2026 ──────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ✓ 2026-01-01  New Year's Day                                           │  │
│  │  ✓ 2026-01-20  Martin Luther King Jr. Day                               │  │
│  │  ✓ 2026-02-17  Presidents' Day                                          │  │
│  │  ✓ 2026-05-25  Memorial Day                                             │  │
│  │  ✓ 2026-07-04  Independence Day                                         │  │
│  │  ✓ 2026-09-07  Labor Day                                                │  │
│  │  ✓ 2026-10-12  Columbus Day                                             │  │
│  │  ✓ 2026-11-11  Veterans Day                                             │  │
│  │  ✓ 2026-11-26  Thanksgiving                                             │  │
│  │  ✓ 2026-12-25  Christmas                                                │  │
│  │                                                                           │  │
│  │  [Edit] [Delete] [+ Add Holiday]                                         │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Client Specific - Acme Corp ────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ✓ 2026-03-15  Company Founding Day                                     │  │
│  │  ✓ 2026-12-24  Christmas Eve (Half Day)                                 │  │
│  │                                                                           │  │
│  │  [Edit] [Delete] [+ Add Holiday]                                         │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Employee Calendar Assignments:                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ Employee      │ Assigned Calendars                                       │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │ John Smith    │ US Federal Holidays, Acme Corp                          │ │
│  │ Jane Doe      │ US Federal Holidays                                      │ │
│  │ Bob Johnson   │ US Federal Holidays, Acme Corp                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Business Logic & Rules

### 1. Timesheet Period Calculation

```
FUNCTION calculate_timesheet_periods(employee, start_date, end_date):
    periods = []
    current_date = start_date

    WHILE current_date <= end_date:
        week_start = get_week_start(current_date, employee.week_config)
        week_end = get_week_end(week_start, employee.week_config)

        # Handle month boundaries
        IF is_month_start(current_date) AND current_date != week_start:
            week_start = current_date

        IF is_month_end(week_end) AND week_end > last_day_of_month(current_date):
            week_end = last_day_of_month(current_date)

        periods.append({
            start: week_start,
            end: week_end,
            expected_hours: calculate_expected_hours(week_start, week_end)
        })

        current_date = week_end + 1 day

    RETURN periods
```

### 2. Validation Rules Engine

```
FUNCTION validate_timesheet(timesheet):
    flags = []

    FOR EACH detail IN timesheet.details:
        # Rule 1: Holiday Work Check
        IF is_holiday(detail.work_date, employee.calendar):
            flags.append({
                type: 'HOLIDAY_WORK',
                severity: 'WARNING',
                message: 'Hours logged on holiday: ' + detail.work_date
            })

        # Rule 2: Overtime Check
        IF detail.hours_worked > employee.daily_threshold:
            IF NOT employee.overtime_allowed:
                flags.append({
                    type: 'OVERTIME_NOT_ALLOWED',
                    severity: 'ERROR',
                    message: 'Overtime not allowed for employee'
                })
            ELSE:
                flags.append({
                    type: 'OVERTIME_DETECTED',
                    severity: 'INFO',
                    message: 'Overtime hours detected'
                })

        # Rule 3: Weekend Work Check
        IF is_weekend(detail.work_date):
            flags.append({
                type: 'WEEKEND_WORK',
                severity: 'WARNING',
                message: 'Weekend work detected'
            })

        # Rule 4: Zero Hours Check
        IF detail.hours_worked == 0 AND is_workday(detail.work_date):
            flags.append({
                type: 'ZERO_HOURS',
                severity: 'INFO',
                message: 'No hours logged on workday'
            })

        # Rule 5: Excessive Hours Check
        IF detail.hours_worked > 12:
            flags.append({
                type: 'EXCESSIVE_HOURS',
                severity: 'ERROR',
                message: 'Hours exceed maximum (12) per day'
            })

    # Rule 6: Weekly Total Check
    weekly_total = SUM(timesheet.details.hours_worked)
    IF weekly_total > employee.weekly_threshold:
        IF NOT employee.overtime_allowed:
            flags.append({
                type: 'WEEKLY_OVERTIME',
                severity: 'ERROR',
                message: 'Weekly hours exceed threshold'
            })

    RETURN flags
```

### 3. Approval Workflow

```
FUNCTION process_timesheet_approval(timesheet):
    # Step 1: Auto-validation
    flags = validate_timesheet(timesheet)

    # Step 2: Determine approval path
    IF flags contains ERROR:
        timesheet.status = 'REJECTED'
        send_notification(employee, 'TIMESHEET_REJECTED', flags)
        RETURN

    IF flags contains WARNING:
        timesheet.status = 'FLAGGED'
        send_notification(approver, 'APPROVAL_REQUIRED_FLAGGED', flags)
    ELSE:
        IF auto_approve_enabled AND timesheet.total_hours <= auto_approve_threshold:
            timesheet.status = 'APPROVED'
            timesheet.approved_by = 'SYSTEM'
            timesheet.approved_date = NOW()
            send_notification(employee, 'TIMESHEET_APPROVED')
        ELSE:
            timesheet.status = 'PENDING'
            send_notification(approver, 'APPROVAL_REQUIRED')
```

### 4. Reminder Scheduling Logic

```
FUNCTION schedule_reminders():
    # Run daily
    FOR EACH employee IN active_employees:
        # Get expected timesheets
        expected_periods = get_expected_periods(employee, current_date)

        FOR EACH period IN expected_periods:
            due_date = period.end_date + employee.grace_period_days

            IF current_date > due_date:
                # Check if timesheet received
                timesheet = get_timesheet(employee, period)

                IF timesheet IS NULL:
                    days_overdue = current_date - due_date

                    # Send reminder based on intervals
                    IF days_overdue IN reminder_intervals:
                        send_reminder(employee, period, days_overdue)

                        # Escalate if configured
                        IF escalation_enabled AND days_overdue >= escalation_threshold:
                            send_escalation(employee.manager, employee, period)
```

---

## Notification System

### Notification Types & Templates

#### 1. Timesheet Reminder
```
Type: REMINDER
Trigger: Timesheet not received by due date
Recipients: Employee
Schedule: Based on reminder_intervals config

Subject: Timesheet Reminder - Week of {week_start}

Body:
Dear {employee_name},

Your timesheet for the week of {week_start} to {week_end} has not been received.

Please submit your timesheet by replying to this email with your timesheet
attached, or by uploading to the shared drive.

Due Date: {due_date}
Days Overdue: {days_overdue}

If you have already submitted, please disregard this message.

Best regards,
Timesheet Management System
```

#### 2. Approval Required
```
Type: APPROVAL_PENDING
Trigger: Timesheet submitted and requires manual approval
Recipients: Approver
Schedule: Immediate

Subject: Timesheet Approval Required - {employee_name}

Body:
Hello {approver_name},

A timesheet requires your approval:

Employee: {employee_name} ({employee_id})
Period: {week_start} to {week_end}
Total Hours: {total_hours}
Submitted: {submission_date}

{validation_flags}

Please review and approve at: {approval_link}

Best regards,
Timesheet Management System
```

#### 3. Hours Flagged
```
Type: HOURS_FLAGGED
Trigger: Validation rules detect anomalies
Recipients: Approver, Employee
Schedule: Immediate

Subject: Timesheet Flagged for Review - {employee_name}

Body:
Attention,

The following timesheet has been flagged for review:

Employee: {employee_name}
Period: {week_start} to {week_end}

Flags Detected:
{flag_list}

Action Required: {action_required}

Review at: {review_link}

Best regards,
Timesheet Management System
```

#### 4. Invoice Ready
```
Type: INVOICE_READY
Trigger: All timesheets for month approved
Recipients: Accounting team
Schedule: End of month

Subject: Monthly Timesheets Complete - Ready for Invoicing

Body:
Hello Accounting Team,

All timesheets for {month} {year} have been received and approved.

Summary:
- Total Employees: {employee_count}
- Total Hours: {total_hours}
- Total Billable Amount: {billable_amount}
- Clients: {client_list}

Download consolidated report: {report_link}

Best regards,
Timesheet Management System
```

---

## Output & Reporting

### 1. Consolidated Timesheet Export Format

#### Excel Export Structure
```
Sheet 1: Summary
┌──────────────────────────────────────────────────────────────┐
│ TIMESHEET SUMMARY REPORT                                     │
│ Period: January 2026                                         │
│ Generated: 2026-02-01 10:00 AM                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Total Employees:     50                                      │
│ Total Hours:         2,040                                   │
│ Approved Hours:      2,040                                   │
│ Billable Amount:     $102,000                               │
└──────────────────────────────────────────────────────────────┘

Sheet 2: Detailed Hours
┌────────┬─────────┬────────┬────────┬────┬───┬───┬───┬───┬───┬───┬───────┬──────────┐
│Emp ID  │Name     │Client  │Week    │Mon │Tue│Wed│Thu│Fri│Sat│Sun│Total  │Approved  │
├────────┼─────────┼────────┼────────┼────┼───┼───┼───┼───┼───┼───┼───────┼──────────┤
│EMP001  │J. Smith │Acme    │01/15-21│ 8.0│8.0│9.5│8.0│0.0│4.0│0.0│ 37.5  │J. Manager│
│EMP001  │J. Smith │Acme    │01/22-28│ 8.0│8.0│8.0│8.0│8.0│0.0│0.0│ 40.0  │J. Manager│
│EMP001  │J. Smith │Acme    │01/29-31│ 8.0│8.0│8.0│ -  │ -  │ -  │ -  │ 24.0  │J. Manager│
│        │         │        │Monthly │                                │101.5  │          │
└────────┴─────────┴────────┴────────┴────┴───┴───┴───┴───┴───┴───┴───────┴──────────┘

Sheet 3: Client Summary
┌───────────────┬──────────────┬─────────────┬──────────────────┐
│Client         │Total Hours   │Employees    │Billable Amount   │
├───────────────┼──────────────┼─────────────┼──────────────────┤
│Acme Corp      │    820       │    20       │   $41,000        │
│TechCo         │    640       │    15       │   $32,000        │
│GlobalInc      │    580       │    15       │   $29,000        │
└───────────────┴──────────────┴─────────────┴──────────────────┘

Sheet 4: Exceptions
┌────────┬─────────┬────────────┬──────────┬─────────────────────┐
│Emp ID  │Name     │Date        │Hours     │Flag                 │
├────────┼─────────┼────────────┼──────────┼─────────────────────┤
│EMP001  │J. Smith │2026-01-17  │ 9.5      │Overtime             │
│EMP001  │J. Smith │2026-01-20  │ 4.0      │Weekend Work         │
│EMP015  │M. Brown │2026-01-01  │ 8.0      │Holiday Work         │
└────────┴─────────┴────────────┴──────────┴─────────────────────┘
```

#### CSV Export Format
```csv
Employee_ID,Employee_Name,Client,Week_Start,Week_End,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday,Weekly_Total,Approved_By,Approval_Date
EMP001,John Smith,Acme Corp,2026-01-15,2026-01-21,8.0,8.0,9.5,8.0,0.0,4.0,0.0,37.5,J. Manager,2026-01-22
EMP001,John Smith,Acme Corp,2026-01-22,2026-01-28,8.0,8.0,8.0,8.0,8.0,0.0,0.0,40.0,J. Manager,2026-01-29
```

#### QuickBooks IIF Format
```
!TIMACT TAB DATE TAB JOB TAB EMP TAB ITEM TAB PITEM TAB DURATION TAB NOTE
TIMACT  01/15/2026  Acme Corp   John Smith  Consulting      8:00    Backend Development
TIMACT  01/16/2026  Acme Corp   John Smith  Consulting      8:00    Database Migration
```

---

## Integration Points

### 1. Email Integration (IMAP/SMTP)

```python
# Email Fetching Configuration
{
    "email_config": {
        "imap_server": "imap.gmail.com",
        "imap_port": 993,
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "username": "timesheets@tbs-team.com",
        "use_ssl": true,
        "polling_interval": 900,  # 15 minutes
        "attachment_types": [".xlsx", ".xls", ".pdf", ".csv"]
    }
}

# Processing Flow
1. Connect to IMAP server
2. Search for unread emails
3. Extract attachments
4. Parse employee ID from sender/subject
5. Save file to processing queue
6. Mark email as read
7. Send acknowledgment email
```

### 2. Google Drive Integration

```python
# Google Drive API Configuration
{
    "google_drive_config": {
        "credentials_file": "credentials.json",
        "folder_id": "1A2B3C4D5E6F",
        "scan_interval": 1800,  # 30 minutes
        "file_types": ["application/vnd.ms-excel", "application/pdf"]
    }
}

# Processing Flow
1. Authenticate with Google Drive API
2. List files in monitored folder
3. Download new/modified files
4. Parse filename for metadata
5. Move to processed subfolder
6. Update file processing log
```

### 3. QuickBooks Integration

```python
# QuickBooks Export Configuration
{
    "quickbooks_config": {
        "export_format": "IIF",  # or "QBO"
        "company_file": "CompanyData.qbw",
        "default_item": "Consulting",
        "mapping": {
            "employee_id": "EMPLOYEE_REF",
            "client": "CUSTOMER_REF",
            "hours": "DURATION",
            "date": "DATE"
        }
    }
}
```

### 4. REST API Endpoints

```
# Core API Endpoints

POST   /api/timesheets                    # Submit timesheet
GET    /api/timesheets/{id}               # Get timesheet details
PUT    /api/timesheets/{id}               # Update timesheet
DELETE /api/timesheets/{id}               # Delete timesheet

POST   /api/timesheets/{id}/approve       # Approve timesheet
POST   /api/timesheets/{id}/reject        # Reject timesheet

GET    /api/employees                     # List employees
POST   /api/employees                     # Create employee
GET    /api/employees/{id}                # Get employee details
PUT    /api/employees/{id}                # Update employee
DELETE /api/employees/{id}                # Delete employee

GET    /api/reports/consolidated          # Generate consolidated report
GET    /api/reports/weekly                # Weekly summary
GET    /api/reports/monthly               # Monthly summary
GET    /api/reports/client/{client_id}    # Client-specific report

GET    /api/notifications                 # List notifications
POST   /api/notifications/send            # Send notification manually

GET    /api/config                        # Get all configurations
PUT    /api/config/{key}                  # Update configuration

GET    /api/calendars                     # List calendars
POST   /api/calendars                     # Create calendar
GET    /api/calendars/{id}/holidays       # Get holidays for calendar
POST   /api/calendars/{id}/holidays       # Add holiday
```

---

## Security & Access Control

### 1. User Roles & Permissions

```
┌─────────────┬──────────┬──────────┬─────────┬───────────┬────────────┐
│ Permission  │ Employee │ Manager  │ Approver│ Accountant│ Admin      │
├─────────────┼──────────┼──────────┼─────────┼───────────┼────────────┤
│ Submit TS   │    ✓     │    ✓     │    ✓    │     -     │     ✓      │
│ View Own TS │    ✓     │    ✓     │    ✓    │     -     │     ✓      │
│ View All TS │    -     │    ✓     │    ✓    │     ✓     │     ✓      │
│ Approve TS  │    -     │    -     │    ✓    │     -     │     ✓      │
│ Edit TS     │    ✓*    │    -     │    ✓    │     -     │     ✓      │
│ Delete TS   │    -     │    -     │    -    │     -     │     ✓      │
│ Manage Emp  │    -     │    ✓**   │    -    │     -     │     ✓      │
│ View Reports│    -     │    ✓     │    ✓    │     ✓     │     ✓      │
│ Export Data │    -     │    ✓     │    -    │     ✓     │     ✓      │
│ Configure   │    -     │    -     │    -    │     -     │     ✓      │
└─────────────┴──────────┴──────────┴─────────┴───────────┴────────────┘

* Only before approval
** Only for direct reports
```

### 2. Authentication & Authorization

```
# Authentication Methods
- Email/Password (with 2FA)
- SSO (SAML/OAuth)
- API Keys (for integrations)

# Session Management
- JWT tokens with 24-hour expiry
- Refresh tokens for API access
- IP whitelisting for admin access

# Audit Logging
- All CRUD operations logged
- Login/logout tracked
- Configuration changes recorded
- Export/download activities logged
```

### 3. Data Privacy & Compliance

```
# GDPR/Privacy Considerations
- Employee data encryption at rest
- Secure file storage (encrypted)
- Right to access (data export)
- Right to deletion (soft delete with retention)
- Audit trail for all access

# Data Retention Policy
- Active timesheets: 7 years
- Inactive employees: 3 years after termination
- Audit logs: 5 years
- Email attachments: Deleted after processing (30 days retention)
```

---

## Implementation Phases

### Phase 1: Core Functionality (MVP)
- [ ] Database setup and schema creation
- [ ] Employee management (CRUD)
- [ ] Manual timesheet entry/upload
- [ ] Basic validation rules (non-agent based)
- [ ] Simple approval workflow
- [ ] Consolidated report generation
- [ ] **LangGraph Setup**: Install dependencies (langgraph, langchain, anthropic)
- [ ] **LangGraph MVP**: Implement Approach 1 (Sequential Processing)
- [ ] **Tool Development**: Create basic tools (get_employee_config, get_calendar_holidays)

### Phase 2: Automation & Agent Enhancement
- [ ] Email integration (IMAP/SMTP)
- [ ] Automated reminder system
- [ ] File parsing (Excel/PDF)
- [ ] Notification system
- [ ] Calendar management
- [ ] **LangGraph Enhancement**: Implement Approach 2 (Parallel Config Fetching)
- [ ] **Guardrails**: Add input validation, rate limiting
- [ ] **Middleware**: Authentication, logging, error handling
- [ ] **State Persistence**: Checkpoint storage with SQLite/PostgreSQL

### Phase 3: Advanced Features & Intelligent Routing
- [ ] Google Drive integration
- [ ] Multi-format template support
- [ ] Advanced reporting (charts, analytics)
- [ ] QuickBooks/Zoho export
- [ ] API development
- [ ] **LangGraph Advanced**: Implement Approach 3 (Supervisor with LLM)
- [ ] **Intelligent Routing**: Hybrid workflow with automatic routing
- [ ] **Human-in-Loop**: Implement Approach 4 for complex cases
- [ ] **Circuit Breakers**: Add resilience patterns

### Phase 4: Optimization & AI Enhancement
- [ ] Performance optimization
- [ ] Scalability improvements (horizontal scaling)
- [ ] Mobile-responsive UI
- [ ] Advanced analytics dashboard
- [ ] **LLM Fine-tuning**: Custom models for domain-specific decisions
- [ ] **Anomaly Detection**: ML-based pattern recognition
- [ ] **Workflow Monitoring**: Real-time dashboards and alerting
- [ ] **A/B Testing**: Compare agent approaches for optimization

---

## LangGraph Agent Workflow

### Overview

The timesheet validation and approval process is orchestrated using **LangGraph**, a framework for building stateful, multi-actor applications with LLMs. The agent workflow intelligently processes timesheets by:

1. **Extracting metadata** (employee, client, period)
2. **Fetching dynamic configurations** (calendars, overtime rules, thresholds)
3. **Validating hours** against business rules
4. **Making approval decisions** or flagging for review
5. **Triggering notifications** based on outcomes

This approach provides flexibility, auditability, and easy customization per client/employee.

---

### Agent Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIMESHEET PROCESSING WORKFLOW                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: INTAKE NODE                                            │
│  - Receive timesheet (file/data)                                │
│  - Extract employee_id, client_id, period                       │
│  - Create initial state                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: CONFIGURATION RETRIEVAL (PARALLEL TOOLS)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Get Employee │  │ Get Client   │  │ Get Calendar │          │
│  │ Config       │  │ Config       │  │ Holidays     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: VALIDATION NODE                                        │
│  - Apply business rules                                         │
│  - Check overtime, holidays, thresholds                         │
│  - Generate validation report                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: DECISION NODE                                          │
│  - Route to: APPROVE / FLAG / REJECT                            │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│  APPROVE    │    │  FLAG FOR       │    │  REJECT     │
│  NODE       │    │  REVIEW NODE    │    │  NODE       │
└─────────────┘    └─────────────────┘    └─────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: NOTIFICATION NODE                                      │
│  - Send emails to relevant parties                              │
│  - Log outcome to database                                      │
│  - Update audit trail                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Approach 1: Sequential Processing with Conditional Routing

**Best for**: Simple validation flows with clear decision trees

```python
from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langchain_core.tools import tool
import operator

# State Definition
class TimesheetState(TypedDict):
    timesheet_id: int
    employee_id: str
    client_id: int
    period_start: str
    period_end: str
    daily_hours: dict  # {date: hours}

    # Configuration data
    employee_config: dict
    client_config: dict
    calendar_holidays: list

    # Validation results
    validation_flags: Annotated[list, operator.add]
    total_hours: float
    decision: Literal["approve", "flag", "reject"]

    # Metadata
    processing_stage: str
    error_message: str

# Tool Definitions
@tool
def get_employee_configuration(employee_id: str) -> dict:
    """
    Fetch employee-specific configurations including:
    - Overtime allowed/disallowed
    - Daily/weekly hour thresholds
    - Submission frequency
    - Assigned calendar
    """
    # Database query
    from database import db_session
    employee = db_session.query(Employee).filter_by(employee_id=employee_id).first()

    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    return {
        "employee_id": employee.employee_id,
        "name": f"{employee.first_name} {employee.last_name}",
        "overtime_allowed": employee.overtime_allowed,
        "daily_threshold": float(employee.daily_hour_threshold),
        "weekly_threshold": float(employee.weekly_hour_threshold),
        "calendar_id": employee.calendar_id,
        "submission_frequency": employee.submission_frequency,
        "approver_email": employee.approver_email,
        "status": employee.status
    }

@tool
def get_client_configuration(client_id: int) -> dict:
    """
    Fetch client-specific configurations including:
    - Billing rates
    - Special rules
    - Invoice frequency
    """
    from database import db_session
    client = db_session.query(Client).filter_by(client_id=client_id).first()

    if not client:
        raise ValueError(f"Client {client_id} not found")

    return {
        "client_id": client.client_id,
        "client_name": client.client_name,
        "client_code": client.client_code,
        "invoice_frequency": client.invoice_frequency,
        "billing_email": client.billing_email,
        "status": client.status
    }

@tool
def get_calendar_holidays(calendar_id: int, start_date: str, end_date: str) -> list:
    """
    Fetch all holidays for a given calendar within the date range.
    Returns list of holiday dates and names.
    """
    from database import db_session
    from datetime import datetime

    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()

    holidays = db_session.query(Holiday).join(Calendar).filter(
        Holiday.calendar_id == calendar_id,
        Holiday.holiday_date >= start,
        Holiday.holiday_date <= end
    ).all()

    return [
        {
            "date": h.holiday_date.strftime("%Y-%m-%d"),
            "name": h.holiday_name,
            "is_recurring": h.is_recurring
        }
        for h in holidays
    ]

@tool
def validate_daily_hours(
    date: str,
    hours: float,
    daily_threshold: float,
    is_holiday: bool,
    is_weekend: bool,
    overtime_allowed: bool
) -> dict:
    """
    Validate hours for a single day against business rules.
    Returns validation status and any flags.
    """
    flags = []
    severity = "VALID"

    # Rule 1: Holiday work
    if is_holiday and hours > 0:
        flags.append({
            "rule": "HOLIDAY_WORK",
            "message": f"Hours logged on holiday: {date}",
            "severity": "WARNING"
        })
        severity = "WARNING"

    # Rule 2: Weekend work
    if is_weekend and hours > 0:
        flags.append({
            "rule": "WEEKEND_WORK",
            "message": f"Weekend work detected: {date}",
            "severity": "WARNING"
        })
        severity = "WARNING"

    # Rule 3: Overtime
    if hours > daily_threshold:
        if not overtime_allowed:
            flags.append({
                "rule": "OVERTIME_NOT_ALLOWED",
                "message": f"Overtime not allowed: {hours} hours on {date}",
                "severity": "ERROR"
            })
            severity = "ERROR"
        else:
            flags.append({
                "rule": "OVERTIME_DETECTED",
                "message": f"Overtime hours: {hours} on {date}",
                "severity": "INFO"
            })

    # Rule 4: Excessive hours
    if hours > 12:
        flags.append({
            "rule": "EXCESSIVE_HOURS",
            "message": f"Excessive hours (>12): {hours} on {date}",
            "severity": "ERROR"
        })
        severity = "ERROR"

    # Rule 5: Negative hours
    if hours < 0:
        flags.append({
            "rule": "NEGATIVE_HOURS",
            "message": f"Invalid negative hours: {hours} on {date}",
            "severity": "ERROR"
        })
        severity = "ERROR"

    return {
        "date": date,
        "hours": hours,
        "flags": flags,
        "severity": severity,
        "is_valid": severity != "ERROR"
    }

# Node Functions
def intake_node(state: TimesheetState) -> TimesheetState:
    """
    Initial processing: extract metadata and prepare state
    """
    print(f"📥 INTAKE: Processing timesheet {state['timesheet_id']}")
    state["processing_stage"] = "intake"
    state["validation_flags"] = []
    return state

def fetch_configurations_node(state: TimesheetState) -> TimesheetState:
    """
    Fetch all necessary configurations in parallel
    """
    print(f"⚙️  CONFIG: Fetching configurations for employee {state['employee_id']}")
    state["processing_stage"] = "configuration"

    try:
        # Fetch employee config
        emp_config = get_employee_configuration.invoke({"employee_id": state["employee_id"]})
        state["employee_config"] = emp_config

        # Fetch client config
        client_config = get_client_configuration.invoke({"client_id": state["client_id"]})
        state["client_config"] = client_config

        # Fetch calendar holidays
        holidays = get_calendar_holidays.invoke({
            "calendar_id": emp_config["calendar_id"],
            "start_date": state["period_start"],
            "end_date": state["period_end"]
        })
        state["calendar_holidays"] = holidays

        print(f"✅ CONFIG: Retrieved {len(holidays)} holidays for calendar {emp_config['calendar_id']}")

    except Exception as e:
        state["error_message"] = f"Configuration fetch failed: {str(e)}"
        state["decision"] = "reject"

    return state

def validation_node(state: TimesheetState) -> TimesheetState:
    """
    Apply all validation rules to timesheet
    """
    print(f"🔍 VALIDATE: Checking hours for {len(state['daily_hours'])} days")
    state["processing_stage"] = "validation"

    from datetime import datetime

    emp_config = state["employee_config"]
    holiday_dates = {h["date"] for h in state["calendar_holidays"]}

    total_hours = 0
    has_errors = False

    for date_str, hours in state["daily_hours"].items():
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        is_weekend = date_obj.weekday() >= 5  # Saturday=5, Sunday=6
        is_holiday = date_str in holiday_dates

        # Validate this day
        validation_result = validate_daily_hours.invoke({
            "date": date_str,
            "hours": hours,
            "daily_threshold": emp_config["daily_threshold"],
            "is_holiday": is_holiday,
            "is_weekend": is_weekend,
            "overtime_allowed": emp_config["overtime_allowed"]
        })

        # Accumulate flags
        if validation_result["flags"]:
            state["validation_flags"].extend(validation_result["flags"])

        if not validation_result["is_valid"]:
            has_errors = True

        total_hours += hours

    state["total_hours"] = total_hours

    # Check weekly threshold
    if total_hours > emp_config["weekly_threshold"]:
        if not emp_config["overtime_allowed"]:
            state["validation_flags"].append({
                "rule": "WEEKLY_OVERTIME",
                "message": f"Weekly hours ({total_hours}) exceed threshold ({emp_config['weekly_threshold']})",
                "severity": "ERROR"
            })
            has_errors = True
        else:
            state["validation_flags"].append({
                "rule": "WEEKLY_OVERTIME",
                "message": f"Weekly overtime: {total_hours} hours",
                "severity": "INFO"
            })

    print(f"📊 VALIDATE: Total hours={total_hours}, Flags={len(state['validation_flags'])}, Errors={has_errors}")

    return state

def decision_node(state: TimesheetState) -> TimesheetState:
    """
    Make approval decision based on validation results
    """
    print(f"⚖️  DECIDE: Making approval decision")
    state["processing_stage"] = "decision"

    # Count severity levels
    error_count = sum(1 for flag in state["validation_flags"] if flag["severity"] == "ERROR")
    warning_count = sum(1 for flag in state["validation_flags"] if flag["severity"] == "WARNING")

    if error_count > 0:
        state["decision"] = "reject"
        print(f"❌ DECIDE: REJECT ({error_count} errors)")
    elif warning_count > 0:
        state["decision"] = "flag"
        print(f"⚠️  DECIDE: FLAG ({warning_count} warnings)")
    else:
        state["decision"] = "approve"
        print(f"✅ DECIDE: APPROVE (no issues)")

    return state

def approve_node(state: TimesheetState) -> TimesheetState:
    """
    Auto-approve timesheet
    """
    print(f"✅ APPROVE: Timesheet {state['timesheet_id']} approved")
    state["processing_stage"] = "approved"

    # Update database
    from database import db_session
    timesheet = db_session.query(Timesheet).get(state["timesheet_id"])
    timesheet.status = "APPROVED"
    timesheet.approved_by = "SYSTEM_AUTO"
    timesheet.approved_date = datetime.now()
    db_session.commit()

    return state

def flag_node(state: TimesheetState) -> TimesheetState:
    """
    Flag timesheet for manual review
    """
    print(f"⚠️  FLAG: Timesheet {state['timesheet_id']} flagged for review")
    state["processing_stage"] = "flagged"

    # Update database
    from database import db_session
    timesheet = db_session.query(Timesheet).get(state["timesheet_id"])
    timesheet.status = "FLAGGED"
    timesheet.flagged_reason = "; ".join([f["message"] for f in state["validation_flags"]])
    db_session.commit()

    return state

def reject_node(state: TimesheetState) -> TimesheetState:
    """
    Reject timesheet due to errors
    """
    print(f"❌ REJECT: Timesheet {state['timesheet_id']} rejected")
    state["processing_stage"] = "rejected"

    # Update database
    from database import db_session
    timesheet = db_session.query(Timesheet).get(state["timesheet_id"])
    timesheet.status = "REJECTED"
    timesheet.flagged_reason = "; ".join([f["message"] for f in state["validation_flags"]])
    db_session.commit()

    return state

def notification_node(state: TimesheetState) -> TimesheetState:
    """
    Send notifications based on outcome
    """
    print(f"📧 NOTIFY: Sending notifications for {state['decision']}")
    state["processing_stage"] = "notification"

    from notifications import send_notification

    emp_config = state["employee_config"]

    if state["decision"] == "approve":
        send_notification(
            to=emp_config["approver_email"],
            subject=f"Timesheet Auto-Approved: {emp_config['name']}",
            template="timesheet_approved",
            context=state
        )
    elif state["decision"] == "flag":
        send_notification(
            to=emp_config["approver_email"],
            subject=f"Timesheet Flagged: {emp_config['name']}",
            template="timesheet_flagged",
            context=state
        )
    elif state["decision"] == "reject":
        send_notification(
            to=emp_config["approver_email"],
            subject=f"Timesheet Rejected: {emp_config['name']}",
            template="timesheet_rejected",
            context=state
        )

    return state

# Routing Function
def route_decision(state: TimesheetState) -> Literal["approve", "flag", "reject"]:
    """
    Route to appropriate outcome node based on decision
    """
    return state["decision"]

# Build the Graph
workflow = StateGraph(TimesheetState)

# Add nodes
workflow.add_node("intake", intake_node)
workflow.add_node("fetch_config", fetch_configurations_node)
workflow.add_node("validate", validation_node)
workflow.add_node("decide", decision_node)
workflow.add_node("approve", approve_node)
workflow.add_node("flag", flag_node)
workflow.add_node("reject", reject_node)
workflow.add_node("notify", notification_node)

# Add edges
workflow.set_entry_point("intake")
workflow.add_edge("intake", "fetch_config")
workflow.add_edge("fetch_config", "validate")
workflow.add_edge("validate", "decide")

# Conditional routing based on decision
workflow.add_conditional_edges(
    "decide",
    route_decision,
    {
        "approve": "approve",
        "flag": "flag",
        "reject": "reject"
    }
)

# All outcomes go to notification
workflow.add_edge("approve", "notify")
workflow.add_edge("flag", "notify")
workflow.add_edge("reject", "notify")

# End after notification
workflow.add_edge("notify", END)

# Compile
app = workflow.compile()
```

**Usage:**
```python
# Process a timesheet
initial_state = {
    "timesheet_id": 12345,
    "employee_id": "EMP001",
    "client_id": 101,
    "period_start": "2026-01-15",
    "period_end": "2026-01-21",
    "daily_hours": {
        "2026-01-15": 8.0,
        "2026-01-16": 8.0,
        "2026-01-17": 9.5,  # Overtime
        "2026-01-18": 8.0,
        "2026-01-19": 0.0,
        "2026-01-20": 4.0,  # Weekend
        "2026-01-21": 0.0
    }
}

result = app.invoke(initial_state)
print(f"Final Decision: {result['decision']}")
print(f"Validation Flags: {result['validation_flags']}")
```

---

### Approach 2: Parallel Configuration Fetching with Sub-Graphs

**Best for**: Complex configurations requiring parallel processing

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class ConfigState(TypedDict):
    employee_id: str
    client_id: int
    calendar_id: int
    period_start: str
    period_end: str

    # Results
    employee_config: dict
    client_config: dict
    calendar_holidays: list
    config_ready: bool

# Sub-graph for parallel config fetching
def create_config_subgraph():
    subgraph = StateGraph(ConfigState)

    def fetch_employee(state: ConfigState):
        state["employee_config"] = get_employee_configuration.invoke({"employee_id": state["employee_id"]})
        return state

    def fetch_client(state: ConfigState):
        state["client_config"] = get_client_configuration.invoke({"client_id": state["client_id"]})
        return state

    def fetch_calendar(state: ConfigState):
        state["calendar_holidays"] = get_calendar_holidays.invoke({
            "calendar_id": state["calendar_id"],
            "start_date": state["period_start"],
            "end_date": state["period_end"]
        })
        return state

    def mark_ready(state: ConfigState):
        state["config_ready"] = True
        return state

    # Add nodes
    subgraph.add_node("fetch_employee", fetch_employee)
    subgraph.add_node("fetch_client", fetch_client)
    subgraph.add_node("fetch_calendar", fetch_calendar)
    subgraph.add_node("mark_ready", mark_ready)

    # Parallel execution
    subgraph.set_entry_point("fetch_employee")
    subgraph.set_entry_point("fetch_client")
    subgraph.set_entry_point("fetch_calendar")

    # All converge to mark_ready
    subgraph.add_edge("fetch_employee", "mark_ready")
    subgraph.add_edge("fetch_client", "mark_ready")
    subgraph.add_edge("fetch_calendar", "mark_ready")

    subgraph.add_edge("mark_ready", END)

    return subgraph.compile()

# Main workflow integrates the sub-graph
def create_main_workflow_with_subgraph():
    workflow = StateGraph(TimesheetState)

    config_graph = create_config_subgraph()

    def run_config_subgraph(state: TimesheetState):
        # Extract relevant state for subgraph
        config_state = {
            "employee_id": state["employee_id"],
            "client_id": state["client_id"],
            "calendar_id": state["employee_config"]["calendar_id"],  # Assumes pre-fetch
            "period_start": state["period_start"],
            "period_end": state["period_end"]
        }

        # Run subgraph
        result = config_graph.invoke(config_state)

        # Update main state
        state["employee_config"] = result["employee_config"]
        state["client_config"] = result["client_config"]
        state["calendar_holidays"] = result["calendar_holidays"]

        return state

    # Add nodes to main workflow
    workflow.add_node("intake", intake_node)
    workflow.add_node("fetch_all_config", run_config_subgraph)
    workflow.add_node("validate", validation_node)
    workflow.add_node("decide", decision_node)
    workflow.add_node("approve", approve_node)
    workflow.add_node("flag", flag_node)
    workflow.add_node("reject", reject_node)
    workflow.add_node("notify", notification_node)

    # Same edges as before
    workflow.set_entry_point("intake")
    workflow.add_edge("intake", "fetch_all_config")
    workflow.add_edge("fetch_all_config", "validate")
    # ... rest of edges

    return workflow.compile()
```

---

### Approach 3: Supervisor Pattern with Specialized Agents

**Best for**: Complex decision-making requiring LLM reasoning

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

class SupervisorState(TypedDict):
    timesheet_data: dict
    employee_config: dict
    client_config: dict
    calendar_holidays: list
    validation_report: dict

    # LLM reasoning
    llm_analysis: str
    final_decision: str
    reasoning: str

    # Agent tracking
    next_agent: str
    agent_history: list

# Specialized agents
def configuration_agent(state: SupervisorState) -> SupervisorState:
    """Agent responsible for fetching configurations"""
    print("🤖 CONFIG AGENT: Fetching configurations...")

    state["employee_config"] = get_employee_configuration.invoke({"employee_id": state["timesheet_data"]["employee_id"]})
    state["client_config"] = get_client_configuration.invoke({"client_id": state["timesheet_data"]["client_id"]})
    state["calendar_holidays"] = get_calendar_holidays.invoke({
        "calendar_id": state["employee_config"]["calendar_id"],
        "start_date": state["timesheet_data"]["period_start"],
        "end_date": state["timesheet_data"]["period_end"]
    })

    state["agent_history"].append("configuration_agent")
    state["next_agent"] = "validation_agent"

    return state

def validation_agent(state: SupervisorState) -> SupervisorState:
    """Agent responsible for applying validation rules"""
    print("🤖 VALIDATION AGENT: Validating timesheet...")

    # Run validation logic
    validation_report = {
        "total_hours": 0,
        "flags": [],
        "errors": [],
        "warnings": []
    }

    # Validate each day
    for date_str, hours in state["timesheet_data"]["daily_hours"].items():
        # ... validation logic
        pass

    state["validation_report"] = validation_report
    state["agent_history"].append("validation_agent")
    state["next_agent"] = "decision_agent"

    return state

def decision_agent(state: SupervisorState) -> SupervisorState:
    """LLM-powered agent for complex decision-making"""
    print("🤖 DECISION AGENT: Analyzing with LLM...")

    llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)

    # Prepare context
    prompt = f"""
You are a timesheet approval agent. Analyze the following timesheet and make a decision.

Employee: {state['employee_config']['name']} ({state['timesheet_data']['employee_id']})
Client: {state['client_config']['client_name']}
Period: {state['timesheet_data']['period_start']} to {state['timesheet_data']['period_end']}

Validation Report:
- Total Hours: {state['validation_report']['total_hours']}
- Errors: {len(state['validation_report']['errors'])}
- Warnings: {len(state['validation_report']['warnings'])}

Flags:
{chr(10).join([f"- {flag['rule']}: {flag['message']}" for flag in state['validation_report']['flags']])}

Employee Configuration:
- Overtime Allowed: {state['employee_config']['overtime_allowed']}
- Daily Threshold: {state['employee_config']['daily_threshold']} hours
- Weekly Threshold: {state['employee_config']['weekly_threshold']} hours

Based on this information, decide:
1. APPROVE - if no errors and acceptable under employee rules
2. FLAG - if warnings exist but may be acceptable with manual review
3. REJECT - if critical errors exist

Provide your decision and reasoning.
"""

    response = llm.invoke([
        SystemMessage(content="You are an expert timesheet approval agent. Provide clear, concise decisions."),
        HumanMessage(content=prompt)
    ])

    state["llm_analysis"] = response.content

    # Parse decision from LLM response
    if "APPROVE" in response.content.upper():
        state["final_decision"] = "approve"
    elif "REJECT" in response.content.upper():
        state["final_decision"] = "reject"
    else:
        state["final_decision"] = "flag"

    state["reasoning"] = response.content
    state["agent_history"].append("decision_agent")
    state["next_agent"] = "notification_agent"

    return state

def notification_agent(state: SupervisorState) -> SupervisorState:
    """Agent responsible for sending notifications"""
    print("🤖 NOTIFICATION AGENT: Sending notifications...")

    # Send appropriate notifications
    # ...

    state["agent_history"].append("notification_agent")
    state["next_agent"] = END

    return state

# Supervisor node
def supervisor(state: SupervisorState) -> SupervisorState:
    """Supervisor coordinates agent execution"""

    current_agent = state.get("next_agent", "configuration_agent")

    print(f"👔 SUPERVISOR: Routing to {current_agent}")

    return state

# Build supervisor workflow
def create_supervisor_workflow():
    workflow = StateGraph(SupervisorState)

    workflow.add_node("supervisor", supervisor)
    workflow.add_node("configuration_agent", configuration_agent)
    workflow.add_node("validation_agent", validation_agent)
    workflow.add_node("decision_agent", decision_agent)
    workflow.add_node("notification_agent", notification_agent)

    # Supervisor routes to agents
    workflow.set_entry_point("supervisor")

    def route_to_agent(state: SupervisorState):
        return state["next_agent"]

    workflow.add_conditional_edges(
        "supervisor",
        route_to_agent,
        {
            "configuration_agent": "configuration_agent",
            "validation_agent": "validation_agent",
            "decision_agent": "decision_agent",
            "notification_agent": "notification_agent",
            END: END
        }
    )

    # Agents return to supervisor
    workflow.add_edge("configuration_agent", "supervisor")
    workflow.add_edge("validation_agent", "supervisor")
    workflow.add_edge("decision_agent", "supervisor")
    workflow.add_edge("notification_agent", "supervisor")

    return workflow.compile()
```

---

### Approach 4: Multi-Agent Collaboration with Human-in-the-Loop

**Best for**: High-stakes decisions requiring human oversight

```python
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.prebuilt import create_react_agent

class HumanReviewState(TimesheetState):
    requires_human_review: bool
    human_decision: str
    human_comments: str
    review_requested_at: str
    reviewed_at: str

def human_review_node(state: HumanReviewState) -> HumanReviewState:
    """
    Pause workflow and request human review
    Uses LangGraph interrupts for human-in-the-loop
    """
    print("👤 HUMAN REVIEW: Pausing for manual review...")

    state["requires_human_review"] = True
    state["review_requested_at"] = datetime.now().isoformat()

    # This will interrupt the workflow
    # Human reviewer will resume with their decision
    from langgraph.errors import NodeInterrupt
    raise NodeInterrupt(f"Timesheet {state['timesheet_id']} requires human review")

def process_human_decision(state: HumanReviewState) -> HumanReviewState:
    """
    Process the human's decision and continue workflow
    """
    print(f"👤 HUMAN DECISION: {state['human_decision']}")

    state["decision"] = state["human_decision"]
    state["reviewed_at"] = datetime.now().isoformat()

    # Log human review
    from database import db_session
    review_log = ApprovalLog(
        timesheet_id=state["timesheet_id"],
        reviewer="human",
        decision=state["human_decision"],
        comments=state["human_comments"],
        reviewed_at=datetime.now()
    )
    db_session.add(review_log)
    db_session.commit()

    return state

# Build workflow with human-in-the-loop
def create_human_in_loop_workflow():
    # Use checkpointer to persist state during interrupts
    memory = SqliteSaver.from_conn_string(":memory:")

    workflow = StateGraph(HumanReviewState)

    # ... add standard nodes ...

    # Add human review nodes
    workflow.add_node("request_human_review", human_review_node)
    workflow.add_node("process_human_decision", process_human_decision)

    # Conditional routing to human review
    def should_request_human_review(state: HumanReviewState) -> str:
        # Request human review for complex cases
        if state["decision"] == "flag":
            # Check if auto-review threshold met
            warning_count = sum(1 for f in state["validation_flags"] if f["severity"] == "WARNING")
            if warning_count > 2:
                return "human_review"

        return state["decision"]

    workflow.add_conditional_edges(
        "decide",
        should_request_human_review,
        {
            "approve": "approve",
            "reject": "reject",
            "flag": "flag",
            "human_review": "request_human_review"
        }
    )

    # After human review, process decision
    workflow.add_edge("request_human_review", "process_human_decision")

    # Route based on human decision
    workflow.add_conditional_edges(
        "process_human_decision",
        route_decision,
        {
            "approve": "approve",
            "flag": "flag",
            "reject": "reject"
        }
    )

    # ... rest of workflow ...

    return workflow.compile(checkpointer=memory, interrupt_before=["request_human_review"])

# Usage with human review
app = create_human_in_loop_workflow()
config = {"configurable": {"thread_id": "timesheet_12345"}}

# Initial invocation
try:
    result = app.invoke(initial_state, config)
except NodeInterrupt as e:
    print(f"Workflow interrupted: {e}")

    # Human reviews and provides decision
    # ... UI presents timesheet for review ...

    # Resume with human decision
    state_update = {
        "human_decision": "approve",
        "human_comments": "Overtime pre-approved for urgent client work"
    }

    result = app.invoke(state_update, config)
```

---

### Guardrails & Middleware

#### 1. Input Validation Guardrails

```python
from typing import Any
from pydantic import BaseModel, validator, Field

class TimesheetInput(BaseModel):
    """Pydantic model for input validation"""

    timesheet_id: int = Field(gt=0)
    employee_id: str = Field(min_length=1, max_length=20, pattern="^EMP[0-9]+$")
    client_id: int = Field(gt=0)
    period_start: str = Field(pattern="^\d{4}-\d{2}-\d{2}$")
    period_end: str = Field(pattern="^\d{4}-\d{2}-\d{2}$")
    daily_hours: dict[str, float] = Field(min_items=1)

    @validator('daily_hours')
    def validate_hours(cls, v):
        for date, hours in v.items():
            if hours < 0:
                raise ValueError(f"Negative hours not allowed: {date}={hours}")
            if hours > 24:
                raise ValueError(f"Hours exceed 24: {date}={hours}")
        return v

    @validator('period_end')
    def validate_period(cls, v, values):
        from datetime import datetime
        start = datetime.strptime(values['period_start'], "%Y-%m-%d")
        end = datetime.strptime(v, "%Y-%m-%d")

        if end < start:
            raise ValueError("period_end must be after period_start")

        if (end - start).days > 31:
            raise ValueError("Period cannot exceed 31 days")

        return v

# Middleware for input validation
def input_validation_middleware(state: dict) -> dict:
    """
    Validate input before processing
    """
    try:
        validated = TimesheetInput(**state)
        return validated.dict()
    except Exception as e:
        raise ValueError(f"Input validation failed: {str(e)}")
```

#### 2. Authentication & Authorization Middleware

```python
from functools import wraps
from typing import Callable

class AuthContext:
    def __init__(self, user_id: str, roles: list[str], permissions: list[str]):
        self.user_id = user_id
        self.roles = roles
        self.permissions = permissions

def require_permission(permission: str):
    """Decorator for permission checking"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(state: dict, context: AuthContext = None, **kwargs):
            if not context:
                raise PermissionError("No authentication context provided")

            if permission not in context.permissions:
                raise PermissionError(f"User {context.user_id} lacks permission: {permission}")

            return func(state, **kwargs)
        return wrapper
    return decorator

# Example usage
@require_permission("timesheet:approve")
def approve_node_with_auth(state: TimesheetState) -> TimesheetState:
    """Approve node with permission check"""
    return approve_node(state)

# Middleware to attach auth context
def auth_middleware(state: dict, user_token: str) -> tuple[dict, AuthContext]:
    """
    Extract and validate authentication token
    """
    # Validate token and extract user info
    user_info = validate_jwt_token(user_token)

    auth_context = AuthContext(
        user_id=user_info["user_id"],
        roles=user_info["roles"],
        permissions=user_info["permissions"]
    )

    return state, auth_context
```

#### 3. Rate Limiting & Circuit Breaker

```python
from datetime import datetime, timedelta
from collections import defaultdict
import threading

class RateLimiter:
    """Token bucket rate limiter"""

    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window  # seconds
        self.requests = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=self.time_window)

            # Remove old requests
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > cutoff
            ]

            # Check limit
            if len(self.requests[key]) >= self.max_requests:
                return False

            # Add new request
            self.requests[key].append(now)
            return True

class CircuitBreaker:
    """Circuit breaker for external service calls"""

    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.lock = threading.Lock()

    def call(self, func: Callable, *args, **kwargs):
        with self.lock:
            if self.state == "OPEN":
                if datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                    self.state = "HALF_OPEN"
                else:
                    raise Exception("Circuit breaker is OPEN")

            try:
                result = func(*args, **kwargs)

                # Success - reset
                if self.state == "HALF_OPEN":
                    self.state = "CLOSED"
                self.failures = 0

                return result

            except Exception as e:
                self.failures += 1
                self.last_failure_time = datetime.now()

                if self.failures >= self.failure_threshold:
                    self.state = "OPEN"

                raise e

# Middleware usage
rate_limiter = RateLimiter(max_requests=100, time_window=60)
circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def rate_limited_middleware(state: dict, user_id: str) -> dict:
    """Apply rate limiting per user"""
    if not rate_limiter.is_allowed(user_id):
        raise Exception(f"Rate limit exceeded for user {user_id}")
    return state

def safe_db_call(func: Callable):
    """Wrap database calls with circuit breaker"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        return circuit_breaker.call(func, *args, **kwargs)
    return wrapper
```

#### 4. Logging & Observability Middleware

```python
import logging
import time
from functools import wraps

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("timesheet_workflow")

def with_logging(node_name: str):
    """Decorator to add logging to nodes"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(state: dict, **kwargs):
            start_time = time.time()

            logger.info(f"[{node_name}] Starting", extra={
                "timesheet_id": state.get("timesheet_id"),
                "employee_id": state.get("employee_id"),
                "node": node_name
            })

            try:
                result = func(state, **kwargs)

                duration = time.time() - start_time
                logger.info(f"[{node_name}] Completed in {duration:.2f}s", extra={
                    "timesheet_id": state.get("timesheet_id"),
                    "duration": duration,
                    "node": node_name,
                    "status": "success"
                })

                return result

            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"[{node_name}] Failed after {duration:.2f}s: {str(e)}", extra={
                    "timesheet_id": state.get("timesheet_id"),
                    "duration": duration,
                    "node": node_name,
                    "status": "error",
                    "error": str(e)
                }, exc_info=True)

                raise

        return wrapper
    return decorator

# Usage
@with_logging("validation")
def validation_node_with_logging(state: TimesheetState) -> TimesheetState:
    return validation_node(state)
```

#### 5. Error Handling & Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class RetryableError(Exception):
    """Exception that should trigger retry"""
    pass

class NonRetryableError(Exception):
    """Exception that should not retry"""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(RetryableError),
    reraise=True
)
def resilient_db_fetch(query_func: Callable, *args, **kwargs):
    """
    Database fetch with retry logic
    """
    try:
        return query_func(*args, **kwargs)
    except ConnectionError as e:
        logger.warning(f"Database connection error, will retry: {e}")
        raise RetryableError(f"DB connection failed: {e}")
    except ValueError as e:
        logger.error(f"Invalid data, will not retry: {e}")
        raise NonRetryableError(f"Invalid data: {e}")

# Error recovery node
def error_recovery_node(state: TimesheetState) -> TimesheetState:
    """
    Handle errors gracefully
    """
    if state.get("error_message"):
        logger.error(f"Error in workflow: {state['error_message']}")

        # Attempt recovery strategies
        if "database" in state["error_message"].lower():
            # Database error - retry
            time.sleep(2)
            # Re-attempt config fetch
            try:
                state = fetch_configurations_node(state)
                state["error_message"] = None  # Clear error
            except Exception as e:
                # Recovery failed
                state["decision"] = "reject"
                state["error_message"] = f"Recovery failed: {str(e)}"

        # Notify admin of error
        send_admin_alert(state)

    return state
```

---

### Complete Orchestration Example with All Guardrails

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

def create_production_workflow():
    """
    Production-ready workflow with all guardrails and middleware
    """

    # Initialize components
    memory = SqliteSaver.from_conn_string("timesheet_checkpoints.db")
    rate_limiter = RateLimiter(max_requests=1000, time_window=3600)

    # Wrap nodes with middleware
    @with_logging("intake")
    @safe_db_call
    def intake_with_guards(state: TimesheetState) -> TimesheetState:
        # Input validation
        state = input_validation_middleware(state)
        return intake_node(state)

    @with_logging("fetch_config")
    @safe_db_call
    def fetch_config_with_guards(state: TimesheetState) -> TimesheetState:
        return fetch_configurations_node(state)

    @with_logging("validate")
    def validate_with_guards(state: TimesheetState) -> TimesheetState:
        return validation_node(state)

    @with_logging("decide")
    def decide_with_guards(state: TimesheetState) -> TimesheetState:
        return decision_node(state)

    # Build workflow
    workflow = StateGraph(TimesheetState)

    workflow.add_node("intake", intake_with_guards)
    workflow.add_node("fetch_config", fetch_config_with_guards)
    workflow.add_node("validate", validate_with_guards)
    workflow.add_node("decide", decide_with_guards)
    workflow.add_node("approve", approve_node)
    workflow.add_node("flag", flag_node)
    workflow.add_node("reject", reject_node)
    workflow.add_node("notify", notification_node)
    workflow.add_node("error_recovery", error_recovery_node)

    # Add edges
    workflow.set_entry_point("intake")
    workflow.add_edge("intake", "fetch_config")

    # Error handling
    def check_for_errors(state: TimesheetState) -> str:
        if state.get("error_message"):
            return "error_recovery"
        return "validate"

    workflow.add_conditional_edges(
        "fetch_config",
        check_for_errors,
        {
            "validate": "validate",
            "error_recovery": "error_recovery"
        }
    )

    workflow.add_edge("error_recovery", "decide")
    workflow.add_edge("validate", "decide")

    workflow.add_conditional_edges(
        "decide",
        route_decision,
        {
            "approve": "approve",
            "flag": "flag",
            "reject": "reject"
        }
    )

    workflow.add_edge("approve", "notify")
    workflow.add_edge("flag", "notify")
    workflow.add_edge("reject", "notify")
    workflow.add_edge("notify", END)

    return workflow.compile(checkpointer=memory)

# Production usage with full guardrails
app = create_production_workflow()

def process_timesheet_safe(timesheet_data: dict, user_token: str):
    """
    Process timesheet with all safety measures
    """
    try:
        # Authenticate
        state, auth_context = auth_middleware(timesheet_data, user_token)

        # Rate limiting
        rate_limited_middleware(state, auth_context.user_id)

        # Process
        config = {"configurable": {"thread_id": f"ts_{state['timesheet_id']}"}}
        result = app.invoke(state, config)

        logger.info(f"Timesheet {state['timesheet_id']} processed: {result['decision']}")

        return {
            "success": True,
            "timesheet_id": result["timesheet_id"],
            "decision": result["decision"],
            "flags": result["validation_flags"]
        }

    except PermissionError as e:
        logger.warning(f"Permission denied: {e}")
        return {"success": False, "error": "Permission denied"}

    except Exception as e:
        logger.error(f"Processing failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
```

---

### Workflow Visualization & Monitoring

```python
# Generate workflow diagram
from langgraph.graph import StateGraph

def visualize_workflow(app):
    """Generate Mermaid diagram of workflow"""
    print(app.get_graph().draw_mermaid())

# Usage
visualize_workflow(app)

# Monitoring dashboard
def get_workflow_metrics(timesheet_id: int):
    """
    Retrieve execution metrics for a timesheet
    """
    from database import db_session

    # Query checkpoints
    checkpoints = db_session.query(WorkflowCheckpoint).filter_by(
        timesheet_id=timesheet_id
    ).order_by(WorkflowCheckpoint.created_at).all()

    metrics = {
        "timesheet_id": timesheet_id,
        "total_duration": None,
        "node_durations": {},
        "retries": 0,
        "errors": []
    }

    for i, checkpoint in enumerate(checkpoints):
        if i > 0:
            duration = (checkpoint.created_at - checkpoints[i-1].created_at).total_seconds()
            metrics["node_durations"][checkpoint.node_name] = duration

        if checkpoint.status == "error":
            metrics["errors"].append({
                "node": checkpoint.node_name,
                "error": checkpoint.error_message
            })

        if checkpoint.retry_count > 0:
            metrics["retries"] += checkpoint.retry_count

    if checkpoints:
        metrics["total_duration"] = (
            checkpoints[-1].created_at - checkpoints[0].created_at
        ).total_seconds()

    return metrics
```

---

### Approach Comparison & Selection Guide

```
┌──────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Criteria     │ Approach 1:     │ Approach 2:     │ Approach 3:     │ Approach 4:     │
│              │ Sequential      │ Parallel        │ Supervisor      │ Human-in-Loop   │
├──────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Complexity   │ Low             │ Medium          │ High            │ High            │
│ Performance  │ Moderate        │ High            │ Moderate        │ Low             │
│ Flexibility  │ Low             │ Medium          │ High            │ Very High       │
│ LLM Usage    │ None/Optional   │ None/Optional   │ Required        │ Optional        │
│ Cost         │ Low             │ Low-Medium      │ Medium-High     │ Medium          │
│ Latency      │ 2-5s            │ 1-3s            │ 3-8s            │ Variable (hrs)  │
│ Auditability │ Good            │ Good            │ Excellent       │ Excellent       │
│ Error Recov. │ Basic           │ Good            │ Excellent       │ Excellent       │
│ Scalability  │ High            │ Very High       │ Medium          │ Low-Medium      │
│ Maintenance  │ Easy            │ Medium          │ Complex         │ Medium          │
└──────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### When to Use Each Approach

**Approach 1: Sequential Processing**
- ✅ Straightforward validation rules
- ✅ Deterministic decision-making
- ✅ High-volume, low-latency requirements
- ✅ Minimal budget for LLM calls
- ❌ Complex edge cases requiring reasoning

**Approach 2: Parallel Configuration Fetching**
- ✅ Multiple independent data sources
- ✅ Need to optimize latency
- ✅ Database-heavy workflows
- ✅ Predictable load patterns
- ❌ Sequential dependencies

**Approach 3: Supervisor with LLM**
- ✅ Complex business logic with exceptions
- ✅ Need natural language explanations
- ✅ Frequent rule changes
- ✅ Contextual decision-making
- ❌ Strict latency SLAs
- ❌ Limited LLM budget

**Approach 4: Human-in-the-Loop**
- ✅ High-stakes decisions (legal, financial)
- ✅ Edge cases requiring judgment
- ✅ Compliance requirements
- ✅ Building trust in automation
- ❌ Need for instant processing
- ❌ High volume (>1000s per day)

---

### Recommended Hybrid Approach

For production deployment, we recommend a **hybrid strategy**:

```python
def intelligent_routing_workflow():
    """
    Route timesheets to appropriate workflow based on characteristics
    """

    def router_node(state: TimesheetState) -> str:
        """
        Intelligent routing based on timesheet characteristics
        """

        # Quick validation - use Approach 1 (Sequential)
        if state["total_hours"] <= 40 and not state.get("client_config", {}).get("requires_review"):
            return "fast_track"

        # Complex validation - use Approach 3 (Supervisor)
        if len(state.get("validation_flags", [])) > 3:
            return "llm_review"

        # Standard validation - use Approach 2 (Parallel)
        return "standard"

    # Build composite workflow
    workflow = StateGraph(TimesheetState)

    workflow.add_node("router", router_node)
    workflow.add_node("fast_track", create_sequential_workflow())
    workflow.add_node("standard", create_parallel_workflow())
    workflow.add_node("llm_review", create_supervisor_workflow())

    workflow.set_entry_point("router")

    workflow.add_conditional_edges(
        "router",
        lambda s: s["next_workflow"],
        {
            "fast_track": "fast_track",
            "standard": "standard",
            "llm_review": "llm_review"
        }
    )

    return workflow.compile()
```

---

### Best Practices for LangGraph Workflows

#### 1. State Management
- **Keep state immutable**: Use Pydantic models for type safety
- **Minimize state size**: Only store essential data
- **Use checkpoints**: Enable recovery from failures
- **Version state schemas**: Handle backwards compatibility

```python
from pydantic import BaseModel, Field

class TimesheetStateV2(BaseModel):
    """Versioned state with validation"""
    schema_version: int = Field(default=2, frozen=True)
    timesheet_id: int
    # ... other fields with validators
```

#### 2. Tool Design
- **Single responsibility**: Each tool does one thing well
- **Idempotent**: Safe to retry without side effects
- **Fast execution**: < 1 second per tool call
- **Clear error messages**: Aid debugging

```python
@tool
def get_employee_config(employee_id: str) -> dict:
    """
    ✅ Good: Focused, fast, idempotent
    """
    return db.query(Employee).get(employee_id)

@tool
def process_everything(data: dict) -> dict:
    """
    ❌ Bad: Does too much, hard to debug
    """
    # Multiple unrelated operations...
```

#### 3. Error Handling
- **Graceful degradation**: Continue with partial data
- **Exponential backoff**: For transient failures
- **Dead letter queue**: For unrecoverable errors
- **Alerting**: Notify on repeated failures

#### 4. Performance Optimization
- **Parallel execution**: Use subgraphs for independent operations
- **Caching**: Cache configuration data (TTL: 5-15 min)
- **Batch processing**: Group similar timesheets
- **Lazy loading**: Fetch data only when needed

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=1000)
@tool
def get_cached_calendar(calendar_id: int, date: str):
    """Cache calendar lookups"""
    # Calendar data changes infrequently
    return fetch_calendar(calendar_id, date)
```

#### 5. Testing & Validation
- **Unit test nodes**: Test each node independently
- **Integration tests**: Test full workflows
- **Snapshot testing**: Compare outputs over time
- **Load testing**: Simulate concurrent workflows

```python
import pytest

def test_validation_node_with_overtime():
    """Test validation node handles overtime correctly"""
    state = {
        "daily_hours": {"2026-01-15": 10.0},
        "employee_config": {
            "overtime_allowed": True,
            "daily_threshold": 8.0
        },
        "calendar_holidays": []
    }

    result = validation_node(state)

    assert result["decision"] == "flag"
    assert any(f["rule"] == "OVERTIME_DETECTED" for f in result["validation_flags"])
```

#### 6. Monitoring & Observability
- **Structured logging**: Use JSON logs with context
- **Trace IDs**: Track requests across nodes
- **Metrics**: Track latency, error rates, decisions
- **Dashboards**: Visualize workflow health

```python
import structlog

logger = structlog.get_logger()

def validation_node(state: TimesheetState):
    with logger.bind(
        timesheet_id=state["timesheet_id"],
        employee_id=state["employee_id"],
        node="validation"
    ):
        logger.info("validation_started")
        # ... validation logic ...
        logger.info("validation_completed",
                   flags_count=len(state["validation_flags"]))
```

#### 7. Security Considerations
- **Input sanitization**: Validate all external inputs
- **Least privilege**: Tools access only necessary data
- **Audit logging**: Track all decisions and changes
- **Data encryption**: Encrypt sensitive state data

```python
from cryptography.fernet import Fernet

class SecureState(TimesheetState):
    """State with encrypted sensitive fields"""

    def encrypt_sensitive_data(self, key: bytes):
        cipher = Fernet(key)
        self.employee_id = cipher.encrypt(self.employee_id.encode())

    def decrypt_sensitive_data(self, key: bytes):
        cipher = Fernet(key)
        self.employee_id = cipher.decrypt(self.employee_id).decode()
```

---

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (Nginx)                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   API Server  │    │   API Server  │    │   API Server  │
│   (FastAPI)   │    │   (FastAPI)   │    │   (FastAPI)   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              MESSAGE QUEUE (Redis/RabbitMQ)                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  LangGraph    │    │  LangGraph    │    │  LangGraph    │
│  Worker 1     │    │  Worker 2     │    │  Worker 3     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│  PostgreSQL   │                          │  Redis Cache  │
│  (Primary DB) │                          │  (Config/     │
│  + Checkpoint │                          │   Sessions)   │
│  Storage      │                          └───────────────┘
└───────────────┘

        ▼
┌───────────────┐
│  Monitoring   │
│  (Prometheus  │
│   + Grafana)  │
└───────────────┘
```

---

## Technology Stack Recommendations

### Backend
- **Framework**: Python (Django/Flask) or Node.js (Express)
- **Database**: PostgreSQL or MySQL
- **Task Queue**: Celery (Python) or Bull (Node.js)
- **Email**: IMAPlib/SMTPlib or Nodemailer
- **File Processing**: Pandas, OpenPyXL, PyPDF2

### AI/Agent Orchestration
- **LangGraph**: Stateful agent workflow orchestration
- **LangChain**: Tool calling and LLM integration
- **Anthropic Claude**: LLM for decision-making (claude-sonnet-4-5)
- **Pydantic**: Schema validation and data modeling
- **Tenacity**: Retry logic and resilience
- **SQLite/PostgreSQL**: State persistence for checkpoints

### Frontend
- **Framework**: React or Vue.js
- **UI Library**: Material-UI or Ant Design
- **Charts**: Chart.js or D3.js
- **State Management**: Redux or Vuex

### Infrastructure
- **Hosting**: AWS, Azure, or Google Cloud
- **Storage**: S3 or Cloud Storage
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack

### Security
- **Authentication**: Auth0 or Passport.js
- **Encryption**: AES-256 for data at rest
- **SSL/TLS**: Let's Encrypt
- **Backup**: Automated daily backups

---

## Testing Strategy

### Unit Tests
- Database models and migrations
- Business logic and validation rules
- Email parsing functions
- Report generation
- Individual LangGraph nodes (intake, validation, decision)
- Tool functions (configuration fetching, holiday lookups)
- Guardrails and middleware (rate limiting, auth, validation)

### Integration Tests
- API endpoints
- Email integration
- Google Drive integration
- Database transactions
- Complete LangGraph workflow execution
- State transitions and routing logic
- Error recovery and retry mechanisms

### Agent Workflow Tests
- End-to-end workflow execution (approve, flag, reject paths)
- Parallel configuration fetching
- Human-in-the-loop interrupts and resumption
- Circuit breaker behavior under failure
- Rate limiting enforcement
- Checkpoint persistence and recovery

### End-to-End Tests
- User workflows (submit → approve → report)
- Reminder scheduling
- Notification delivery
- Report export

### Performance Tests
- Concurrent user load
- Large dataset processing
- Report generation speed
- Email processing throughput

---

## Quick Start Guide: LangGraph Agent Workflow

### Installation

```bash
# Install core dependencies
pip install langgraph langchain langchain-anthropic pydantic tenacity

# Install database and utilities
pip install sqlalchemy psycopg2-binary redis

# Install observability tools
pip install structlog prometheus-client

# Install testing tools
pip install pytest pytest-asyncio
```

### Environment Setup

```bash
# .env file
export ANTHROPIC_API_KEY="sk-ant-..."
export DATABASE_URL="postgresql://user:pass@localhost/timesheet_db"
export REDIS_URL="redis://localhost:6379"
export LOG_LEVEL="INFO"
```

### Minimal Working Example

```python
# main.py - Complete minimal implementation
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.tools import tool

# 1. Define State
class TimesheetState(TypedDict):
    timesheet_id: int
    employee_id: str
    daily_hours: dict
    total_hours: float
    decision: str
    flags: list

# 2. Create Tools
@tool
def validate_hours(daily_hours: dict, threshold: float = 8.0) -> dict:
    """Validate daily hours against threshold"""
    flags = []
    total = sum(daily_hours.values())

    for date, hours in daily_hours.items():
        if hours > threshold:
            flags.append(f"Overtime on {date}: {hours} hours")

    return {"total_hours": total, "flags": flags}

# 3. Define Nodes
def intake_node(state: TimesheetState):
    print(f"Processing timesheet {state['timesheet_id']}")
    return state

def validate_node(state: TimesheetState):
    result = validate_hours.invoke({
        "daily_hours": state["daily_hours"],
        "threshold": 8.0
    })
    state["total_hours"] = result["total_hours"]
    state["flags"] = result["flags"]
    return state

def decide_node(state: TimesheetState):
    if len(state["flags"]) > 0:
        state["decision"] = "flag"
    else:
        state["decision"] = "approve"
    return state

# 4. Build Workflow
workflow = StateGraph(TimesheetState)
workflow.add_node("intake", intake_node)
workflow.add_node("validate", validate_node)
workflow.add_node("decide", decide_node)

workflow.set_entry_point("intake")
workflow.add_edge("intake", "validate")
workflow.add_edge("validate", "decide")
workflow.add_edge("decide", END)

app = workflow.compile()

# 5. Run
if __name__ == "__main__":
    result = app.invoke({
        "timesheet_id": 1,
        "employee_id": "EMP001",
        "daily_hours": {
            "2026-01-15": 8.0,
            "2026-01-16": 9.5,  # Overtime
            "2026-01-17": 8.0
        },
        "total_hours": 0.0,
        "decision": "",
        "flags": []
    })

    print(f"Decision: {result['decision']}")
    print(f"Total Hours: {result['total_hours']}")
    print(f"Flags: {result['flags']}")
```

**Output:**
```
Processing timesheet 1
Decision: flag
Total Hours: 25.5
Flags: ['Overtime on 2026-01-16: 9.5 hours']
```

### Running with Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "workflow_runner.py"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: timesheet_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  workflow_worker:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:password@postgres/timesheet_db
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
```

**Start:**
```bash
docker-compose up -d
```

### Testing Your Workflow

```python
# test_workflow.py
import pytest
from main import app, TimesheetState

def test_approve_valid_timesheet():
    """Test that valid timesheet gets approved"""
    input_state = {
        "timesheet_id": 1,
        "employee_id": "EMP001",
        "daily_hours": {
            "2026-01-15": 8.0,
            "2026-01-16": 8.0,
            "2026-01-17": 8.0
        },
        "total_hours": 0.0,
        "decision": "",
        "flags": []
    }

    result = app.invoke(input_state)

    assert result["decision"] == "approve"
    assert result["total_hours"] == 24.0
    assert len(result["flags"]) == 0

def test_flag_overtime_timesheet():
    """Test that overtime gets flagged"""
    input_state = {
        "timesheet_id": 2,
        "employee_id": "EMP002",
        "daily_hours": {
            "2026-01-15": 10.0,  # Overtime
        },
        "total_hours": 0.0,
        "decision": "",
        "flags": []
    }

    result = app.invoke(input_state)

    assert result["decision"] == "flag"
    assert len(result["flags"]) > 0
```

**Run tests:**
```bash
pytest test_workflow.py -v
```

### Monitoring & Debugging

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Visualize workflow
from IPython.display import Image, display

display(Image(app.get_graph().draw_mermaid_png()))

# Get execution trace
result = app.invoke(input_state, {"run_name": "timesheet_001"})

# Inspect state at each step
for step in app.stream(input_state):
    print(f"Step: {step}")
```

### Common Commands

```bash
# Run workflow for single timesheet
python -m workflow_runner --timesheet-id 12345

# Process batch of timesheets
python -m batch_processor --date 2026-01-21

# View workflow graph
python -c "from main import app; print(app.get_graph().draw_mermaid())"

# Run with checkpointing enabled
python -m workflow_runner --checkpoint-db timesheets.db --timesheet-id 12345

# Resume from checkpoint
python -m workflow_runner --resume-thread ts_12345
```

### Deployment to Production

```python
# production_runner.py
from fastapi import FastAPI, BackgroundTasks
from main import app as workflow_app

api = FastAPI()

@api.post("/process-timesheet")
async def process_timesheet(
    timesheet_id: int,
    background_tasks: BackgroundTasks
):
    """
    API endpoint to trigger timesheet processing
    """
    background_tasks.add_task(run_workflow, timesheet_id)
    return {"status": "processing", "timesheet_id": timesheet_id}

def run_workflow(timesheet_id: int):
    """Background task to run LangGraph workflow"""
    # Fetch timesheet data from database
    timesheet_data = fetch_from_db(timesheet_id)

    # Run workflow
    result = workflow_app.invoke(timesheet_data)

    # Save result
    save_to_db(timesheet_id, result)

    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000)
```

**Deploy with Kubernetes:**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: timesheet-workflow
spec:
  replicas: 3
  selector:
    matchLabels:
      app: timesheet-workflow
  template:
    metadata:
      labels:
        app: timesheet-workflow
    spec:
      containers:
      - name: workflow
        image: timesheet-workflow:latest
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: anthropic-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: langgraph` | Run `pip install langgraph` |
| Workflow hangs | Check for circular edges, add timeout |
| State not persisting | Ensure checkpointer is configured |
| High latency | Use parallel nodes, cache configs |
| LLM errors | Verify ANTHROPIC_API_KEY, check rate limits |
| Database connection fails | Check DATABASE_URL, firewall rules |

### Next Steps

1. **Customize for your needs**: Modify state schema, add custom tools
2. **Add more guardrails**: Implement auth, rate limiting, validation
3. **Integrate with UI**: Build React dashboard for monitoring
4. **Scale horizontally**: Add more workflow workers
5. **Monitor performance**: Set up Prometheus + Grafana

---

## Deployment Checklist

### Infrastructure
- [ ] Database migrations executed
- [ ] Environment variables configured (DATABASE_URL, REDIS_URL, etc.)
- [ ] Email credentials verified
- [ ] Google Drive API enabled
- [ ] SSL certificate installed
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured (Prometheus, Grafana)

### LangGraph Agent Workflow
- [ ] ANTHROPIC_API_KEY configured
- [ ] LangGraph dependencies installed (langgraph, langchain, anthropic)
- [ ] Checkpoint database created and migrated
- [ ] Tool definitions tested and validated
- [ ] Workflow graph validated (no circular dependencies)
- [ ] State schema versioned and documented
- [ ] Guardrails implemented (rate limiting, auth, input validation)
- [ ] Error handling and retry logic tested
- [ ] Circuit breakers configured for external services
- [ ] Logging and observability configured (structured logs, trace IDs)

### Testing & Validation
- [ ] Unit tests passing (nodes, tools, validators)
- [ ] Integration tests passing (full workflow execution)
- [ ] Load testing completed (concurrent workflow execution)
- [ ] Human-in-loop flow tested (if applicable)
- [ ] Workflow visualization generated and reviewed

### Documentation & Training
- [ ] User documentation prepared
- [ ] Training materials created
- [ ] API documentation generated
- [ ] Workflow diagrams published
- [ ] Runbooks for common issues created

### Security & Compliance
- [ ] Security audit completed
- [ ] API keys rotated and secured
- [ ] Access control policies configured
- [ ] Audit logging enabled
- [ ] Data encryption verified (at rest and in transit)
- [ ] GDPR/compliance requirements met

---

## Support & Maintenance

### Monitoring
- System uptime monitoring
- Email processing queue health
- Database performance metrics
- Failed notification tracking
- **Agent Workflow Metrics**:
  - Workflow execution latency (p50, p95, p99)
  - Decision distribution (approve/flag/reject rates)
  - Error rates by node
  - LLM API usage and costs
  - Circuit breaker state (OPEN/CLOSED/HALF_OPEN)
  - Checkpoint storage size and age

### Regular Tasks
- **Daily**:
  - Review agent workflow errors and failures
  - Check LLM API quota and rate limits
  - Monitor workflow execution times
- **Weekly**:
  - Review flagged timesheets requiring human intervention
  - Analyze workflow decision patterns
  - Update guardrail thresholds if needed
- **Monthly**:
  - Archive old checkpoint data
  - Review and optimize slow nodes
  - Update holiday calendars
- **Quarterly**:
  - Security audit (including API keys rotation)
  - Performance optimization review
  - Workflow A/B testing results analysis
- **Annually**:
  - Calendar updates for next year
  - Major dependency updates (LangGraph, LangChain)
  - Comprehensive cost analysis (LLM usage)

### Troubleshooting

#### Traditional System Issues
- **Email not received**: Check IMAP connection, spam folder, firewall rules
- **File not parsed**: Verify file format, check template mapping, review parsing logs
- **Notification not sent**: Check SMTP settings, email queue, recipient validity
- **Report generation failed**: Check date range, data completeness, database connectivity

#### Agent Workflow Issues
- **Workflow stuck/hanging**:
  - Check for circular edges in graph definition
  - Review node execution logs for infinite loops
  - Verify checkpoint database connectivity
  - Check Redis/message queue health

- **High error rates**:
  - Review error logs with trace IDs
  - Check external service health (database, LLM API)
  - Verify circuit breaker states
  - Ensure retry logic is functioning

- **Slow execution**:
  - Identify bottleneck nodes using metrics
  - Check if config caching is working
  - Review database query performance
  - Consider increasing parallelization

- **Incorrect decisions**:
  - Review validation flags and reasoning
  - Check if configurations are up-to-date
  - Verify business rules implementation
  - Review LLM prompts (for Supervisor approach)

- **LLM API errors**:
  - Verify ANTHROPIC_API_KEY is valid
  - Check rate limits and quotas
  - Review API error codes (429, 500, etc.)
  - Implement exponential backoff if needed

- **State persistence issues**:
  - Check checkpoint database health
  - Verify state schema compatibility
  - Review checkpoint cleanup policies
  - Ensure sufficient disk space

#### Emergency Procedures
- **Circuit breaker OPEN**: Manual override available in admin panel, investigate root cause before resetting
- **Mass failures**: Pause workflow processing, enable manual fallback, investigate and fix
- **Data corruption**: Restore from checkpoint backup, replay affected timesheets
- **Security breach**: Rotate all API keys immediately, review audit logs, notify stakeholders

---

## Contact & Support

For questions or clarifications, please reach out to the project team.

**Document Version**: 1.0
**Last Updated**: 2026-01-21
**Author**: Development Team

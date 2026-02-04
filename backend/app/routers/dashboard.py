from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import json

from app.database import get_db
from app.models import (
    Employee, Client, UserRole, Timesheet, TimesheetStatus,
    EmployeeClientAssignment, BusinessCalendar
)
from app.auth import require_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class TimesheetPeriodStatus(BaseModel):
    period_start: date
    period_end: date
    status: str  # "approved", "submitted", "missing"
    timesheet_id: Optional[int] = None


class EmployeeTimesheetStatus(BaseModel):
    employee_id: int
    employee_name: str
    employee_email: str
    pay_rate: Optional[float] = None
    overtime_allowed: bool = True
    periods: List[TimesheetPeriodStatus] = []


class ClientWithEmployees(BaseModel):
    client_id: int
    client_name: str
    client_code: str
    bill_rate: Optional[float] = None
    submission_frequency: str
    employees: List[EmployeeTimesheetStatus] = []


class DashboardStats(BaseModel):
    total_clients: int
    total_employees: int
    pending_timesheets: int
    approved_timesheets: int
    missing_timesheets: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    clients_with_employees: List[ClientWithEmployees]


def get_timesheet_periods(frequency: str, year: int, month: int) -> List[dict]:
    """Generate expected timesheet periods based on frequency."""
    periods = []

    if frequency == "weekly":
        # Generate weekly periods for the month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        # Find the first Monday of the month or use month start
        current = first_day
        while current <= last_day:
            week_end = current + timedelta(days=6)
            if week_end > last_day:
                week_end = last_day
            periods.append({
                "start": current,
                "end": week_end
            })
            current = week_end + timedelta(days=1)

    elif frequency == "biweekly":
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        current = first_day
        while current <= last_day:
            period_end = current + timedelta(days=13)
            if period_end > last_day:
                period_end = last_day
            periods.append({
                "start": current,
                "end": period_end
            })
            current = period_end + timedelta(days=1)

    elif frequency == "monthly":
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)

        periods.append({
            "start": first_day,
            "end": last_day
        })

    return periods


@router.get("/", response_model=DashboardResponse)
def get_dashboard_data(
    year: int = Query(default=None, description="Year to filter by"),
    month: int = Query(default=None, description="Month to filter by (1-12)"),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """
    Get dashboard data with employees grouped by client and their timesheet status.
    """
    # Use current year/month if not specified
    now = datetime.now()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    # Get all active clients
    clients = db.query(Client).filter(Client.is_active == True).all()

    # Get stats
    total_clients = len(clients)
    total_employees = db.query(Employee).filter(
        Employee.is_active == True,
        Employee.role == UserRole.EMPLOYEE
    ).count()

    # Calculate timesheet stats for the period
    period_start = date(year, month, 1)
    if month == 12:
        period_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = date(year, month + 1, 1) - timedelta(days=1)

    pending_timesheets = db.query(Timesheet).filter(
        Timesheet.status == TimesheetStatus.SUBMITTED,
        Timesheet.period_start >= period_start,
        Timesheet.period_end <= period_end
    ).count()

    approved_timesheets = db.query(Timesheet).filter(
        Timesheet.status == TimesheetStatus.APPROVED,
        Timesheet.period_start >= period_start,
        Timesheet.period_end <= period_end
    ).count()

    clients_with_employees = []

    for client in clients:
        # Get all active employee assignments for this client
        assignments = db.query(EmployeeClientAssignment).filter(
            EmployeeClientAssignment.client_id == client.id,
            EmployeeClientAssignment.is_active == True
        ).all()

        employee_statuses = []

        for assignment in assignments:
            employee = db.query(Employee).filter(
                Employee.id == assignment.employee_id,
                Employee.is_active == True
            ).first()

            if not employee:
                continue

            # Get expected periods based on client's submission frequency
            expected_periods = get_timesheet_periods(
                client.default_submission_frequency,
                year,
                month
            )

            period_statuses = []

            for period in expected_periods:
                # Check if timesheet exists for this period
                timesheet = db.query(Timesheet).filter(
                    Timesheet.employee_id == employee.id,
                    Timesheet.client_id == client.id,
                    Timesheet.period_start == period["start"],
                    Timesheet.period_end == period["end"]
                ).first()

                if timesheet:
                    if timesheet.status == TimesheetStatus.APPROVED:
                        status = "approved"
                    elif timesheet.status == TimesheetStatus.SUBMITTED:
                        status = "submitted"
                    else:
                        status = "draft"

                    period_statuses.append(TimesheetPeriodStatus(
                        period_start=period["start"],
                        period_end=period["end"],
                        status=status,
                        timesheet_id=timesheet.id
                    ))
                else:
                    period_statuses.append(TimesheetPeriodStatus(
                        period_start=period["start"],
                        period_end=period["end"],
                        status="missing",
                        timesheet_id=None
                    ))

            employee_statuses.append(EmployeeTimesheetStatus(
                employee_id=employee.id,
                employee_name=f"{employee.first_name} {employee.last_name}",
                employee_email=employee.email,
                pay_rate=assignment.pay_rate or employee.pay_rate,
                overtime_allowed=assignment.overtime_allowed,
                periods=period_statuses
            ))

        if employee_statuses:  # Only include clients with employees
            clients_with_employees.append(ClientWithEmployees(
                client_id=client.id,
                client_name=client.name,
                client_code=client.code,
                bill_rate=client.bill_rate,
                submission_frequency=client.default_submission_frequency,
                employees=employee_statuses
            ))

    # Calculate missing timesheets
    total_expected = sum(
        len(emp.periods) for client in clients_with_employees for emp in client.employees
    )
    missing_timesheets = sum(
        1 for client in clients_with_employees
        for emp in client.employees
        for period in emp.periods
        if period.status == "missing"
    )

    stats = DashboardStats(
        total_clients=total_clients,
        total_employees=total_employees,
        pending_timesheets=pending_timesheets,
        approved_timesheets=approved_timesheets,
        missing_timesheets=missing_timesheets
    )

    return DashboardResponse(
        stats=stats,
        clients_with_employees=clients_with_employees
    )


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE))
):
    """Get quick dashboard statistics."""
    total_clients = db.query(Client).filter(Client.is_active == True).count()
    total_employees = db.query(Employee).filter(
        Employee.is_active == True,
        Employee.role == UserRole.EMPLOYEE
    ).count()

    pending = db.query(Timesheet).filter(
        Timesheet.status == TimesheetStatus.SUBMITTED
    ).count()

    approved = db.query(Timesheet).filter(
        Timesheet.status == TimesheetStatus.APPROVED
    ).count()

    return {
        "total_clients": total_clients,
        "total_employees": total_employees,
        "pending_timesheets": pending,
        "approved_timesheets": approved
    }

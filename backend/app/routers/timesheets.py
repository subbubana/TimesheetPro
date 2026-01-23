from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Timesheet, TimesheetDetail, Employee, UserRole, TimesheetStatus, Client, Holiday
from app.schemas import TimesheetCreate, TimesheetResponse, TimesheetUpdate
from app.auth import get_current_employee, require_role

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


def calculate_timesheet_totals(timesheet: Timesheet, db: Session):
    total_hours = sum(detail.hours for detail in timesheet.details)
    total_overtime = sum(detail.overtime_hours for detail in timesheet.details)

    timesheet.total_hours = total_hours
    timesheet.total_overtime = total_overtime


def validate_and_flag_holidays(timesheet: Timesheet, db: Session):
    client = db.query(Client).filter(Client.id == timesheet.client_id).first()
    if not client or not client.calendar_id:
        return

    for detail in timesheet.details:
        holiday = db.query(Holiday).filter(
            Holiday.calendar_id == client.calendar_id,
            Holiday.date == detail.work_date
        ).first()

        if holiday:
            detail.is_holiday = True


@router.post("/", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def create_timesheet(
    timesheet_data: TimesheetCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    client = db.query(Client).filter(Client.id == timesheet_data.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    existing_timesheet = db.query(Timesheet).filter(
        Timesheet.employee_id == current_employee.id,
        Timesheet.period_start == timesheet_data.period_start,
        Timesheet.period_end == timesheet_data.period_end
    ).first()

    if existing_timesheet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet already exists for this period"
        )

    timesheet = Timesheet(
        employee_id=current_employee.id,
        client_id=timesheet_data.client_id,
        period_start=timesheet_data.period_start,
        period_end=timesheet_data.period_end,
        notes=timesheet_data.notes,
        status=TimesheetStatus.DRAFT
    )

    db.add(timesheet)
    db.flush()

    for detail_data in timesheet_data.details:
        detail = TimesheetDetail(
            timesheet_id=timesheet.id,
            **detail_data.model_dump()
        )
        db.add(detail)

    db.flush()

    validate_and_flag_holidays(timesheet, db)
    calculate_timesheet_totals(timesheet, db)

    db.commit()
    db.refresh(timesheet)

    return timesheet


@router.get("/", response_model=List[TimesheetResponse])
def get_timesheets(
    skip: int = 0,
    limit: int = 100,
    status: TimesheetStatus = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    query = db.query(Timesheet)

    if current_employee.role == UserRole.EMPLOYEE:
        query = query.filter(Timesheet.employee_id == current_employee.id)
    elif current_employee.role == UserRole.MANAGER:
        subordinate_ids = [emp.id for emp in current_employee.subordinates]
        subordinate_ids.append(current_employee.id)
        query = query.filter(Timesheet.employee_id.in_(subordinate_ids))

    if status:
        query = query.filter(Timesheet.status == status)

    timesheets = query.offset(skip).limit(limit).all()
    return timesheets


@router.get("/{timesheet_id}", response_model=TimesheetResponse)
def get_timesheet(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if current_employee.role == UserRole.EMPLOYEE and timesheet.employee_id != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this timesheet"
        )

    return timesheet


@router.put("/{timesheet_id}", response_model=TimesheetResponse)
def update_timesheet(
    timesheet_id: int,
    timesheet_update: TimesheetUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if current_employee.role == UserRole.EMPLOYEE and timesheet.employee_id != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this timesheet"
        )

    if timesheet.status == TimesheetStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update approved timesheet"
        )

    update_data = timesheet_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(timesheet, field, value)

    if timesheet.status == TimesheetStatus.SUBMITTED and not timesheet.submission_date:
        timesheet.submission_date = datetime.utcnow()

    db.commit()
    db.refresh(timesheet)

    return timesheet


@router.delete("/{timesheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timesheet(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if current_employee.role != UserRole.ADMIN and timesheet.employee_id != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this timesheet"
        )

    if timesheet.status != TimesheetStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft timesheets"
        )

    db.delete(timesheet)
    db.commit()

    return None


@router.post("/{timesheet_id}/submit", response_model=TimesheetResponse)
def submit_timesheet(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if timesheet.employee_id != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit this timesheet"
        )

    if timesheet.status != TimesheetStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet already submitted"
        )

    timesheet.status = TimesheetStatus.SUBMITTED
    timesheet.submission_date = datetime.utcnow()

    db.commit()
    db.refresh(timesheet)

    return timesheet

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Calendar, Holiday, Employee, UserRole
from app.schemas import CalendarCreate, CalendarResponse, CalendarUpdate, HolidayCreate, HolidayResponse
from app.auth import require_role

router = APIRouter(prefix="/calendars", tags=["Calendars"])


@router.post("/", response_model=CalendarResponse, status_code=status.HTTP_201_CREATED)
def create_calendar(
    calendar_data: CalendarCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    existing_calendar = db.query(Calendar).filter(Calendar.name == calendar_data.name).first()
    if existing_calendar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Calendar name already exists"
        )

    calendar = Calendar(**calendar_data.model_dump())
    db.add(calendar)
    db.commit()
    db.refresh(calendar)

    return calendar


@router.get("/", response_model=List[CalendarResponse])
def get_calendars(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    calendars = db.query(Calendar).offset(skip).limit(limit).all()
    return calendars


@router.get("/{calendar_id}", response_model=CalendarResponse)
def get_calendar(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )

    return calendar


@router.put("/{calendar_id}", response_model=CalendarResponse)
def update_calendar(
    calendar_id: int,
    calendar_update: CalendarUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )

    update_data = calendar_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(calendar, field, value)

    db.commit()
    db.refresh(calendar)

    return calendar


@router.post("/{calendar_id}/holidays", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(
    calendar_id: int,
    holiday_data: HolidayCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )

    if holiday_data.calendar_id != calendar_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Calendar ID mismatch"
        )

    holiday = Holiday(**holiday_data.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)

    return holiday


@router.get("/{calendar_id}/holidays", response_model=List[HolidayResponse])
def get_holidays(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar not found"
        )

    holidays = db.query(Holiday).filter(Holiday.calendar_id == calendar_id).all()
    return holidays

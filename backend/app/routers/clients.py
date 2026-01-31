from typing import List
from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client, Employee, UserRole, BusinessCalendar
from app.schemas import ClientCreate, ClientResponse, ClientUpdate, BusinessCalendarCreate, BusinessCalendarResponse, BusinessCalendarUpdate
from app.auth import require_role

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    existing_client = db.query(Client).filter(Client.code == client_data.code).first()
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client code already exists"
        )

    # Extract non_working_dates before creating client
    non_working_dates = client_data.non_working_dates
    client_dict = client_data.model_dump(exclude={'non_working_dates'})

    client = Client(**client_dict)
    db.add(client)
    db.flush()  # Get the client ID

    # Create business calendar for the current year if dates provided
    if non_working_dates:
        current_year = datetime.now().year
        calendar = BusinessCalendar(
            client_id=client.id,
            year=current_year,
            name=f"{client.name} - {current_year} Calendar",
            non_working_dates=json.dumps(non_working_dates),
            is_active=True
        )
        db.add(calendar)

    db.commit()
    db.refresh(client)

    return client


@router.get("/", response_model=List[ClientResponse])
def get_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_update: ClientUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    update_data = client_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    client.is_active = False
    db.commit()

    return None


# Business Calendar endpoints
@router.post("/{client_id}/calendars", response_model=BusinessCalendarResponse, status_code=status.HTTP_201_CREATED)
def create_business_calendar(
    client_id: int,
    calendar_data: BusinessCalendarCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Create a business calendar for a client for a specific year"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check if calendar already exists for this year
    existing = db.query(BusinessCalendar).filter(
        BusinessCalendar.client_id == client_id,
        BusinessCalendar.year == calendar_data.year
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calendar for year {calendar_data.year} already exists for this client"
        )

    calendar = BusinessCalendar(
        client_id=client_id,
        year=calendar_data.year,
        name=calendar_data.name or f"{client.name} - {calendar_data.year} Calendar",
        non_working_dates=json.dumps(calendar_data.non_working_dates),
        is_active=True
    )

    db.add(calendar)
    db.commit()
    db.refresh(calendar)

    return calendar


@router.get("/{client_id}/calendars", response_model=List[BusinessCalendarResponse])
def get_client_calendars(
    client_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    """Get all business calendars for a client"""
    calendars = db.query(BusinessCalendar).filter(
        BusinessCalendar.client_id == client_id
    ).all()
    return calendars


@router.get("/{client_id}/calendars/{year}", response_model=BusinessCalendarResponse)
def get_client_calendar_by_year(
    client_id: int,
    year: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    """Get business calendar for a specific year"""
    calendar = db.query(BusinessCalendar).filter(
        BusinessCalendar.client_id == client_id,
        BusinessCalendar.year == year
    ).first()

    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendar for year {year} not found for this client"
        )

    return calendar


@router.put("/{client_id}/calendars/{year}", response_model=BusinessCalendarResponse)
def update_business_calendar(
    client_id: int,
    year: int,
    calendar_update: BusinessCalendarUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Update a business calendar"""
    calendar = db.query(BusinessCalendar).filter(
        BusinessCalendar.client_id == client_id,
        BusinessCalendar.year == year
    ).first()

    if not calendar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Calendar for year {year} not found for this client"
        )

    if calendar_update.name is not None:
        calendar.name = calendar_update.name
    if calendar_update.non_working_dates is not None:
        calendar.non_working_dates = json.dumps(calendar_update.non_working_dates)
    if calendar_update.is_active is not None:
        calendar.is_active = calendar_update.is_active

    db.commit()
    db.refresh(calendar)

    return calendar

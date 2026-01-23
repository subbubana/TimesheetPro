from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeResponse, LoginRequest, Token
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    get_current_employee
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def register(employee_data: EmployeeCreate, db: Session = Depends(get_db)):
    existing_employee = db.query(Employee).filter(Employee.email == employee_data.email).first()
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(employee_data.password)
    employee = Employee(
        email=employee_data.email,
        hashed_password=hashed_password,
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        role=employee_data.role,
        submission_frequency=employee_data.submission_frequency,
        manager_id=employee_data.manager_id,
        client_id=employee_data.client_id,
        week_start_day=employee_data.week_start_day
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == login_data.email).first()

    if not employee or not verify_password(login_data.password, employee.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(data={"sub": employee.email})
    refresh_token = create_refresh_token(data={"sub": employee.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=EmployeeResponse)
def get_current_user(current_employee: Employee = Depends(get_current_employee)):
    return current_employee


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    from app.auth import decode_token

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    email = payload.get("sub")
    employee = db.query(Employee).filter(Employee.email == email).first()

    if not employee or not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Employee not found or inactive"
        )

    new_access_token = create_access_token(data={"sub": employee.email})
    new_refresh_token = create_refresh_token(data={"sub": employee.email})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

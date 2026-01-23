from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee, UserRole
from app.schemas import EmployeeResponse, EmployeeUpdate, EmployeeCreateByAdmin
from app.auth import get_current_employee, require_role

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee_by_admin(
    employee_data: EmployeeCreateByAdmin,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Admin endpoint to create employees without passwords (for staffing vendor use case)"""
    existing_employee = db.query(Employee).filter(Employee.email == employee_data.email).first()
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    employee = Employee(
        email=employee_data.email,
        hashed_password=None,  # No password - employees don't log in
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        role=UserRole.EMPLOYEE,  # Force employee role
        submission_frequency=employee_data.submission_frequency,
        manager_id=employee_data.manager_id,
        client_id=employee_data.client_id,
        week_start_day=employee_data.week_start_day
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


@router.get("/", response_model=List[EmployeeResponse])
def get_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    employees = db.query(Employee).offset(skip).limit(limit).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    if current_employee.id != employee_id and current_employee.role not in [UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this employee"
        )

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    if current_employee.id != employee_id and current_employee.role not in [UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this employee"
        )

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    update_data = employee_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    employee.is_active = False
    db.commit()

    return None

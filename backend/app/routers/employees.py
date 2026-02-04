from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Employee, UserRole, EmployeeClientAssignment, Client, SubmissionFrequency
from app.schemas import EmployeeResponse, EmployeeUpdate, EmployeeCreateByAdmin, EmployeeClientAssignmentCreate, EmployeeClientAssignmentResponse
from app.auth import get_current_employee, require_role

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee_by_admin(
    employee_data: EmployeeCreateByAdmin,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Admin endpoint to create employees without passwords (employees never log in)"""
    existing_employee = db.query(Employee).filter(Employee.email == employee_data.email).first()
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Get submission frequency from first client if any
    submission_frequency = SubmissionFrequency.WEEKLY
    if employee_data.client_ids:
        first_client = db.query(Client).filter(Client.id == employee_data.client_ids[0]).first()
        if first_client:
            submission_frequency = first_client.default_submission_frequency

    employee = Employee(
        email=employee_data.email,
        hashed_password=None,  # No password - employees don't log in
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        role=UserRole.EMPLOYEE,  # Force employee role
        submission_frequency=submission_frequency,
        manager_id=employee_data.manager_id,
        week_start_day=employee_data.week_start_day,
        pay_rate=employee_data.pay_rate,
        overtime_allowed=employee_data.overtime_allowed
    )

    db.add(employee)
    db.flush()  # Get the employee ID

    # Create client assignments
    for client_id in employee_data.client_ids:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Client with ID {client_id} not found"
            )

        assignment = EmployeeClientAssignment(
            employee_id=employee.id,
            client_id=client_id,
            pay_rate=employee_data.pay_rate,
            overtime_allowed=employee_data.overtime_allowed,
            is_active=True
        )
        db.add(assignment)

    db.commit()
    db.refresh(employee)

    return employee


@router.get("/", response_model=List[EmployeeResponse])
def get_employees(
    skip: int = 0,
    limit: int = 100,
    client_id: int = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    """Get all employees with their client assignments. Optionally filter by client_id."""
    query = db.query(Employee).options(joinedload(Employee.client_assignments))

    if client_id:
        query = query.join(EmployeeClientAssignment).filter(EmployeeClientAssignment.client_id == client_id)

    employees = query.offset(skip).limit(limit).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    employee = db.query(Employee).options(
        joinedload(Employee.client_assignments)
    ).filter(Employee.id == employee_id).first()

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
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
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


# Client Assignment endpoints
@router.post("/{employee_id}/assignments", response_model=EmployeeClientAssignmentResponse, status_code=status.HTTP_201_CREATED)
def add_client_assignment(
    employee_id: int,
    assignment_data: EmployeeClientAssignmentCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Add a client assignment to an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    client = db.query(Client).filter(Client.id == assignment_data.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check if assignment already exists
    existing = db.query(EmployeeClientAssignment).filter(
        EmployeeClientAssignment.employee_id == employee_id,
        EmployeeClientAssignment.client_id == assignment_data.client_id,
        EmployeeClientAssignment.is_active == True
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee is already assigned to this client"
        )

    assignment = EmployeeClientAssignment(
        employee_id=employee_id,
        client_id=assignment_data.client_id,
        pay_rate=assignment_data.pay_rate or employee.pay_rate,
        overtime_allowed=assignment_data.overtime_allowed,
        start_date=assignment_data.start_date,
        end_date=assignment_data.end_date,
        is_active=True
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


@router.get("/{employee_id}/assignments", response_model=List[EmployeeClientAssignmentResponse])
def get_employee_assignments(
    employee_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN, UserRole.FINANCE))
):
    """Get all client assignments for an employee"""
    assignments = db.query(EmployeeClientAssignment).filter(
        EmployeeClientAssignment.employee_id == employee_id
    ).all()
    return assignments


@router.delete("/{employee_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_client_assignment(
    employee_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    """Remove a client assignment from an employee"""
    assignment = db.query(EmployeeClientAssignment).filter(
        EmployeeClientAssignment.id == assignment_id,
        EmployeeClientAssignment.employee_id == employee_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    assignment.is_active = False
    db.commit()

    return None

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Approval, Timesheet, Employee, UserRole, ApprovalStatus, TimesheetStatus
from app.schemas import ApprovalResponse, ApprovalUpdate
from app.auth import get_current_employee, require_role

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("/", response_model=List[ApprovalResponse])
def get_approvals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN))
):
    query = db.query(Approval).filter(Approval.approver_id == current_employee.id)
    approvals = query.offset(skip).limit(limit).all()
    return approvals


@router.get("/{approval_id}", response_model=ApprovalResponse)
def get_approval(
    approval_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found"
        )

    if current_employee.role not in [UserRole.MANAGER, UserRole.ADMIN] and approval.approver_id != current_employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this approval"
        )

    return approval


@router.put("/{approval_id}", response_model=ApprovalResponse)
def update_approval(
    approval_id: int,
    approval_update: ApprovalUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found"
        )

    if approval.approver_id != current_employee.id and current_employee.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this approval"
        )

    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval already processed"
        )

    approval.status = approval_update.status
    approval.comments = approval_update.comments
    approval.approval_date = datetime.utcnow()

    timesheet = db.query(Timesheet).filter(Timesheet.id == approval.timesheet_id).first()
    if timesheet:
        if approval_update.status == ApprovalStatus.APPROVED:
            timesheet.status = TimesheetStatus.APPROVED
        elif approval_update.status == ApprovalStatus.REJECTED:
            timesheet.status = TimesheetStatus.REJECTED

    db.commit()
    db.refresh(approval)

    return approval


@router.post("/timesheet/{timesheet_id}", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
def create_approval_for_timesheet(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.MANAGER, UserRole.ADMIN))
):
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if timesheet.status != TimesheetStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet must be submitted for approval"
        )

    existing_approval = db.query(Approval).filter(
        Approval.timesheet_id == timesheet_id,
        Approval.approver_id == current_employee.id
    ).first()

    if existing_approval:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval already exists for this timesheet"
        )

    approval = Approval(
        timesheet_id=timesheet_id,
        approver_id=current_employee.id,
        status=ApprovalStatus.PENDING
    )

    db.add(approval)
    db.commit()
    db.refresh(approval)

    return approval

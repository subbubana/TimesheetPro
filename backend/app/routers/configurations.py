from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Configuration, Employee, UserRole
from app.schemas import ConfigurationCreate, ConfigurationResponse, ConfigurationUpdate
from app.auth import require_role, get_current_employee

router = APIRouter(prefix="/configurations", tags=["Configurations"])


@router.post("/", response_model=ConfigurationResponse, status_code=status.HTTP_201_CREATED)
def create_configuration(
    config_data: ConfigurationCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    existing_config = db.query(Configuration).filter(Configuration.key == config_data.key).first()
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configuration key already exists"
        )

    config = Configuration(**config_data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)

    return config


@router.get("/", response_model=List[ConfigurationResponse])
def get_configurations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    configs = db.query(Configuration).offset(skip).limit(limit).all()
    return configs


@router.get("/{config_id}", response_model=ConfigurationResponse)
def get_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )

    return config


@router.get("/key/{key}", response_model=ConfigurationResponse)
def get_configuration_by_key(
    key: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    config = db.query(Configuration).filter(Configuration.key == key).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )

    return config


@router.put("/{config_id}", response_model=ConfigurationResponse)
def update_configuration(
    config_id: int,
    config_update: ConfigurationUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )

    update_data = config_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)

    return config


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role(UserRole.ADMIN))
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )

    db.delete(config)
    db.commit()

    return None

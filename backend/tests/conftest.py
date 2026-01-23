import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from app.database import Base, get_db
from app.main import app
from app.models import Employee, Client, Calendar, UserRole, SubmissionFrequency
from app.auth import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_employee(db_session):
    employee = Employee(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        first_name="Test",
        last_name="Employee",
        role=UserRole.EMPLOYEE,
        submission_frequency=SubmissionFrequency.WEEKLY
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)
    return employee


@pytest.fixture
def test_manager(db_session):
    manager = Employee(
        email="manager@example.com",
        hashed_password=get_password_hash("managerpass123"),
        first_name="Test",
        last_name="Manager",
        role=UserRole.MANAGER,
        submission_frequency=SubmissionFrequency.WEEKLY
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)
    return manager


@pytest.fixture
def test_admin(db_session):
    admin = Employee(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass123"),
        first_name="Test",
        last_name="Admin",
        role=UserRole.ADMIN,
        submission_frequency=SubmissionFrequency.WEEKLY
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def test_client_entity(db_session):
    client = Client(
        name="Test Client",
        code="TEST001",
        overtime_threshold_daily=8.0,
        overtime_threshold_weekly=40.0
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


@pytest.fixture
def test_calendar(db_session):
    calendar = Calendar(
        name="US Holidays",
        description="Standard US holiday calendar"
    )
    db_session.add(calendar)
    db_session.commit()
    db_session.refresh(calendar)
    return calendar


@pytest.fixture
def auth_headers(client, test_employee):
    response = client.post(
        "/auth/login",
        json={"email": "test@example.com", "password": "testpassword123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manager_auth_headers(client, test_manager):
    response = client.post(
        "/auth/login",
        json={"email": "manager@example.com", "password": "managerpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client, test_admin):
    response = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "adminpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

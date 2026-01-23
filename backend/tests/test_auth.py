import pytest
from app.models import UserRole, SubmissionFrequency


class TestAuthentication:
    def test_register_employee(self, client):
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "securepass123",
                "first_name": "New",
                "last_name": "User",
                "role": "employee",
                "submission_frequency": "weekly",
                "week_start_day": 1
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["last_name"] == "User"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client, test_employee):
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "testpass123",
                "first_name": "Duplicate",
                "last_name": "User",
                "role": "employee",
                "submission_frequency": "weekly"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_login_success(self, client, test_employee):
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_employee):
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"}
        )
        assert response.status_code == 401

    def test_get_current_user(self, client, auth_headers):
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["first_name"] == "Test"

    def test_get_current_user_without_auth(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 403

    def test_refresh_token(self, client, test_employee):
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"}
        )
        refresh_token = login_response.json()["refresh_token"]

        response = client.post(f"/auth/refresh?refresh_token={refresh_token}")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

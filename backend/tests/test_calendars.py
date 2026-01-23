import pytest
from datetime import date


class TestCalendars:
    def test_create_calendar(self, client, admin_auth_headers):
        response = client.post(
            "/calendars/",
            headers=admin_auth_headers,
            json={
                "name": "Test Calendar",
                "description": "A test calendar"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Calendar"

    def test_get_calendars(self, client, admin_auth_headers, test_calendar):
        response = client.get("/calendars/", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_calendar_by_id(self, client, admin_auth_headers, test_calendar):
        response = client.get(f"/calendars/{test_calendar.id}", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_calendar.id
        assert data["name"] == test_calendar.name

    def test_update_calendar(self, client, admin_auth_headers, test_calendar):
        response = client.put(
            f"/calendars/{test_calendar.id}",
            headers=admin_auth_headers,
            json={"description": "Updated description"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"

    def test_create_holiday(self, client, admin_auth_headers, test_calendar):
        response = client.post(
            f"/calendars/{test_calendar.id}/holidays",
            headers=admin_auth_headers,
            json={
                "calendar_id": test_calendar.id,
                "name": "New Year's Day",
                "date": "2026-01-01",
                "is_recurring": True
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Year's Day"
        assert data["is_recurring"] is True

    def test_get_holidays(self, client, admin_auth_headers, test_calendar):
        client.post(
            f"/calendars/{test_calendar.id}/holidays",
            headers=admin_auth_headers,
            json={
                "calendar_id": test_calendar.id,
                "name": "Test Holiday",
                "date": "2026-12-25",
                "is_recurring": False
            }
        )

        response = client.get(f"/calendars/{test_calendar.id}/holidays", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

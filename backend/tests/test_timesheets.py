import pytest
from datetime import date, timedelta


class TestTimesheets:
    def test_create_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "notes": "Test timesheet",
                "details": [
                    {
                        "work_date": str(today),
                        "hours": 8.0,
                        "overtime_hours": 0.0,
                        "description": "Regular work"
                    },
                    {
                        "work_date": str(today + timedelta(days=1)),
                        "hours": 9.0,
                        "overtime_hours": 1.0,
                        "description": "Overtime work"
                    }
                ]
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["client_id"] == test_client_entity.id
        assert data["status"] == "draft"
        assert len(data["details"]) == 2
        assert data["total_hours"] == 17.0

    def test_create_duplicate_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        timesheet_data = {
            "client_id": test_client_entity.id,
            "period_start": str(today),
            "period_end": str(today + timedelta(days=6)),
            "details": []
        }

        client.post("/timesheets/", headers=auth_headers, json=timesheet_data)
        response = client.post("/timesheets/", headers=auth_headers, json=timesheet_data)

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_get_timesheets(self, client, auth_headers, test_client_entity):
        today = date.today()
        client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )

        response = client.get("/timesheets/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_timesheet_by_id(self, client, auth_headers, test_client_entity):
        today = date.today()
        create_response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )
        timesheet_id = create_response.json()["id"]

        response = client.get(f"/timesheets/{timesheet_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == timesheet_id

    def test_update_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        create_response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )
        timesheet_id = create_response.json()["id"]

        response = client.put(
            f"/timesheets/{timesheet_id}",
            headers=auth_headers,
            json={"notes": "Updated notes"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Updated notes"

    def test_submit_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        create_response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )
        timesheet_id = create_response.json()["id"]

        response = client.post(f"/timesheets/{timesheet_id}/submit", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "submitted"
        assert data["submission_date"] is not None

    def test_delete_draft_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        create_response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )
        timesheet_id = create_response.json()["id"]

        response = client.delete(f"/timesheets/{timesheet_id}", headers=auth_headers)
        assert response.status_code == 204

    def test_cannot_delete_submitted_timesheet(self, client, auth_headers, test_client_entity):
        today = date.today()
        create_response = client.post(
            "/timesheets/",
            headers=auth_headers,
            json={
                "client_id": test_client_entity.id,
                "period_start": str(today),
                "period_end": str(today + timedelta(days=6)),
                "details": []
            }
        )
        timesheet_id = create_response.json()["id"]

        client.post(f"/timesheets/{timesheet_id}/submit", headers=auth_headers)
        response = client.delete(f"/timesheets/{timesheet_id}", headers=auth_headers)

        assert response.status_code == 400

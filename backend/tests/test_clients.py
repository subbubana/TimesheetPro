import pytest


class TestClients:
    def test_create_client_as_admin(self, client, admin_auth_headers):
        response = client.post(
            "/clients/",
            headers=admin_auth_headers,
            json={
                "name": "New Client",
                "code": "NC001",
                "overtime_threshold_daily": 8.0,
                "overtime_threshold_weekly": 40.0
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Client"
        assert data["code"] == "NC001"

    def test_create_client_as_employee_forbidden(self, client, auth_headers):
        response = client.post(
            "/clients/",
            headers=auth_headers,
            json={
                "name": "Unauthorized Client",
                "code": "UC001"
            }
        )
        assert response.status_code == 403

    def test_create_client_duplicate_code(self, client, admin_auth_headers, test_client_entity):
        response = client.post(
            "/clients/",
            headers=admin_auth_headers,
            json={
                "name": "Duplicate Client",
                "code": "TEST001"
            }
        )
        assert response.status_code == 400

    def test_get_clients(self, client, admin_auth_headers, test_client_entity):
        response = client.get("/clients/", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_client_by_id(self, client, admin_auth_headers, test_client_entity):
        response = client.get(f"/clients/{test_client_entity.id}", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_client_entity.id
        assert data["name"] == test_client_entity.name

    def test_update_client(self, client, admin_auth_headers, test_client_entity):
        response = client.put(
            f"/clients/{test_client_entity.id}",
            headers=admin_auth_headers,
            json={"name": "Updated Client Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Client Name"

    def test_delete_client(self, client, admin_auth_headers, test_client_entity):
        response = client.delete(f"/clients/{test_client_entity.id}", headers=admin_auth_headers)
        assert response.status_code == 204

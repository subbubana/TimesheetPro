import pytest


class TestEmployees:
    def test_get_employees_as_admin(self, client, admin_auth_headers, test_employee):
        response = client.get("/employees/", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_employees_as_employee_forbidden(self, client, auth_headers):
        response = client.get("/employees/", headers=auth_headers)
        assert response.status_code == 403

    def test_get_employee_by_id(self, client, auth_headers, test_employee):
        response = client.get(f"/employees/{test_employee.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_employee.id
        assert data["email"] == test_employee.email

    def test_get_employee_by_id_unauthorized(self, client, auth_headers, test_admin):
        response = client.get(f"/employees/{test_admin.id}", headers=auth_headers)
        assert response.status_code == 403

    def test_update_employee_own_profile(self, client, auth_headers, test_employee):
        response = client.put(
            f"/employees/{test_employee.id}",
            headers=auth_headers,
            json={"first_name": "Updated"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"

    def test_update_employee_unauthorized(self, client, auth_headers, test_admin):
        response = client.put(
            f"/employees/{test_admin.id}",
            headers=auth_headers,
            json={"first_name": "Hacked"}
        )
        assert response.status_code == 403

    def test_delete_employee_as_admin(self, client, admin_auth_headers, test_employee):
        response = client.delete(f"/employees/{test_employee.id}", headers=admin_auth_headers)
        assert response.status_code == 204

    def test_delete_employee_as_non_admin(self, client, auth_headers, test_employee):
        response = client.delete(f"/employees/{test_employee.id}", headers=auth_headers)
        assert response.status_code == 403

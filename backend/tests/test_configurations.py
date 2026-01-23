import pytest


class TestConfigurations:
    def test_create_configuration(self, client, admin_auth_headers):
        response = client.post(
            "/configurations/",
            headers=admin_auth_headers,
            json={
                "key": "test_config",
                "value": "test_value",
                "description": "Test configuration"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["key"] == "test_config"
        assert data["value"] == "test_value"

    def test_create_configuration_as_employee_forbidden(self, client, auth_headers):
        response = client.post(
            "/configurations/",
            headers=auth_headers,
            json={
                "key": "unauthorized_config",
                "value": "value"
            }
        )
        assert response.status_code == 403

    def test_get_configurations(self, client, auth_headers):
        response = client.get("/configurations/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_configuration_by_key(self, client, admin_auth_headers, auth_headers):
        client.post(
            "/configurations/",
            headers=admin_auth_headers,
            json={
                "key": "lookup_test",
                "value": "test_value"
            }
        )

        response = client.get("/configurations/key/lookup_test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "lookup_test"
        assert data["value"] == "test_value"

    def test_update_configuration(self, client, admin_auth_headers):
        create_response = client.post(
            "/configurations/",
            headers=admin_auth_headers,
            json={
                "key": "update_test",
                "value": "original_value"
            }
        )
        config_id = create_response.json()["id"]

        response = client.put(
            f"/configurations/{config_id}",
            headers=admin_auth_headers,
            json={"value": "updated_value"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == "updated_value"

    def test_delete_configuration(self, client, admin_auth_headers):
        create_response = client.post(
            "/configurations/",
            headers=admin_auth_headers,
            json={
                "key": "delete_test",
                "value": "value"
            }
        )
        config_id = create_response.json()["id"]

        response = client.delete(f"/configurations/{config_id}", headers=admin_auth_headers)
        assert response.status_code == 204

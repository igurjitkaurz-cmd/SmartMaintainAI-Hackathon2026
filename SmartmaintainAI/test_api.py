"""
SmartMaintainAI - Automated REST API & Integration Test Suite
Verifies all Flask API endpoints and model inference pipelines.
"""

import unittest
import json
import sqlite3
import uuid
from pathlib import Path
from app import app, get_db, init_db, model, feature_columns


class SmartMaintainAPITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        app.config["SECRET_KEY"] = "test_secret_key"
        cls.client = app.test_client()
        init_db()

    def test_01_health_endpoint(self):
        """Test GET /api/health returns model status and metadata."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.is_json)
        data = response.get_json()

        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "SmartMaintainAI API")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["model_type"], "RandomForestClassifier")
        self.assertEqual(data["classes"], [0, 1])
        self.assertEqual(data["feature_columns"], feature_columns)

    def test_01b_health_slashes_and_aliases(self):
        """Test trailing slashes, alias routes, and HTTP methods on health endpoint."""
        # /api/health/ (with trailing slash)
        res_slash = self.client.get("/api/health/")
        self.assertEqual(res_slash.status_code, 200)
        self.assertEqual(res_slash.get_json()["status"], "healthy")

        # /health alias
        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.get_json()["status"], "healthy")

        # /health/ alias
        res_health_slash = self.client.get("/health/")
        self.assertEqual(res_health_slash.status_code, 200)

        # /api root endpoint
        res_api = self.client.get("/api")
        self.assertEqual(res_api.status_code, 200)
        self.assertEqual(res_api.get_json()["status"], "healthy")

        # OPTIONS preflight
        res_opt = self.client.options("/api/health")
        self.assertIn(res_opt.status_code, [200, 204])

        # HEAD request
        res_head = self.client.head("/api/health")
        self.assertEqual(res_head.status_code, 200)

    def test_01c_api_not_found_handler(self):
        """Test that missing /api routes return structured 404 JSON."""
        res_404 = self.client.get("/api/nonexistent_endpoint")
        self.assertEqual(res_404.status_code, 404)
        data = res_404.get_json()
        self.assertIn("error", data)
        self.assertIn("available_endpoints", data)
        self.assertIn("/api/health", data["available_endpoints"])

    def test_01d_cors_headers_consistency(self):
        """Test CORS headers for both localhost:5173 and 127.0.0.1:5173 origins."""
        # With localhost:5173 origin
        res_local = self.client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(res_local.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")
        self.assertEqual(res_local.headers.get("Access-Control-Allow-Credentials"), "true")

        # With 127.0.0.1:5173 origin
        res_ip = self.client.get("/api/health", headers={"Origin": "http://127.0.0.1:5173"})
        self.assertEqual(res_ip.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5173")
        self.assertEqual(res_ip.headers.get("Access-Control-Allow-Credentials"), "true")

        # Without Origin header (direct navigation)
        res_direct = self.client.get("/api/health")
        self.assertEqual(res_direct.headers.get("Access-Control-Allow-Origin"), "*")
        self.assertIsNone(res_direct.headers.get("Access-Control-Allow-Credentials"))

    def test_01e_debug_routes_endpoint(self):
        """Test diagnostic /__debug_routes endpoint returns registered routes."""
        res = self.client.get("/__debug_routes")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.is_json)
        data = res.get_json()
        self.assertIn("file", data)
        self.assertIn("routes", data)
        rules = [r["rule"] for r in data["routes"]]
        self.assertIn("/api/health", rules)
        self.assertIn("/api/predict", rules)
        self.assertIn("/api/machines", rules)
        self.assertIn("/api/dashboard/stats", rules)

    def test_02_predict_normal_operation(self):
        """Test POST /api/predict with nominal operating parameters."""
        payload = {
            "machine_type": "M",
            "air_temperature": 300.0,
            "process_temperature": 310.0,
            "rotational_speed": 1500,
            "torque": 40.0,
            "tool_wear": 50
        }
        response = self.client.post(
            "/api/predict",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertEqual(data["prediction"], 0)
        self.assertEqual(data["prediction_label"], "No Failure Predicted")
        self.assertLess(data["failure_probability"], 50.0)
        self.assertEqual(data["risk_level"], "LOW")
        self.assertIn("Continue routine operational monitoring", data["suggestion"])

        diagnostics = data["failure_mode_diagnostics"]
        self.assertEqual(diagnostics["tool_wear_failure"]["risk"], "NORMAL")
        self.assertEqual(diagnostics["heat_dissipation_failure"]["risk"], "NORMAL")
        self.assertEqual(diagnostics["power_failure"]["risk"], "NORMAL")
        self.assertEqual(diagnostics["overstrain_failure"]["risk"], "NORMAL")

    def test_03_predict_failure_condition(self):
        """Test POST /api/predict with extreme failure conditions."""
        payload = {
            "machine_type": "L",
            "air_temperature": 304.0,
            "process_temperature": 305.0,
            "rotational_speed": 1200,
            "torque": 70.0,
            "tool_wear": 240
        }
        response = self.client.post(
            "/api/predict",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertEqual(data["prediction"], 1)
        self.assertEqual(data["prediction_label"], "Failure Predicted")
        self.assertGreater(data["failure_probability"], 50.0)
        self.assertEqual(data["risk_level"], "CRITICAL")
        self.assertIn("Arrange an urgent maintenance inspection", data["suggestion"])

        diagnostics = data["failure_mode_diagnostics"]
        self.assertEqual(diagnostics["tool_wear_failure"]["risk"], "CRITICAL")
        self.assertEqual(diagnostics["heat_dissipation_failure"]["risk"], "CRITICAL")
        self.assertEqual(diagnostics["overstrain_failure"]["risk"], "CRITICAL")

    def test_04_predict_camel_case_keys(self):
        """Test POST /api/predict supports camelCase and frontend keys."""
        payload = {
            "qualityType": "H",
            "airTemperature": 298.5,
            "processTemperature": 308.7,
            "rotationalSpeed": 1600,
            "torque": 35.0,
            "toolWear": 20
        }
        response = self.client.post(
            "/api/predict",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["parameters_evaluated"]["machine_type"], "H")

    def test_05_predict_validation_errors(self):
        """Test POST /api/predict handles invalid payloads."""
        # Missing fields
        res1 = self.client.post("/api/predict", data=json.dumps({}), content_type="application/json")
        self.assertEqual(res1.status_code, 400)

        # Invalid machine quality type
        res2 = self.client.post("/api/predict", data=json.dumps({
            "machine_type": "Z",
            "air_temperature": 300,
            "process_temperature": 310,
            "rotational_speed": 1500,
            "torque": 40,
            "tool_wear": 50
        }), content_type="application/json")
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Machine quality type must be 'L', 'M', or 'H'", res2.get_json()["error"])

        # Negative air temperature
        res3 = self.client.post("/api/predict", data=json.dumps({
            "machine_type": "M",
            "air_temperature": -5,
            "process_temperature": 310,
            "rotational_speed": 1500,
            "torque": 40,
            "tool_wear": 50
        }), content_type="application/json")
        self.assertEqual(res3.status_code, 400)

    def test_06_dashboard_stats(self):
        """Test GET /api/dashboard/stats returns aggregate metrics."""
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertIn("total_machines", data)
        self.assertIn("type_distribution", data)
        self.assertIn("prediction_distribution", data)
        self.assertIn("risk_distribution", data)
        self.assertIn("averages", data)
        self.assertIn("model_metadata", data)
        self.assertEqual(data["model_metadata"]["type"], "RandomForestClassifier")

    def test_07_auth_and_machines_lifecycle(self):
        """Test user registration, login, and authenticated machine management."""
        test_user = f"tester_{uuid.uuid4().hex[:10]}"
        test_pass = "secure_pass_123"

        # Register
        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": test_pass}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        user_info = reg_res.get_json()["user"]
        user_id = user_info["id"]

        # Check /api/auth/me
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.get_json()["authenticated"])
        self.assertEqual(me_res.get_json()["user"]["username"], test_user)

        # Add machine for authenticated user
        machine_payload = {
            "name": "HAAS-VF2-TEST",
            "machine_type": "M",
            "air_temperature": 301.2,
            "process_temperature": 311.5,
            "rotational_speed": 1450,
            "torque": 42.0,
            "tool_wear": 45,
            "manufacturer": "Haas",
            "model_number": "VF-2",
            "location": "Bay 4"
        }
        add_res = self.client.post(
            "/api/machines",
            data=json.dumps(machine_payload),
            content_type="application/json"
        )
        self.assertEqual(add_res.status_code, 201)
        created_machine = add_res.get_json()["machine"]
        self.assertEqual(created_machine["machine_name"], "HAAS-VF2-TEST")
        self.assertEqual(created_machine["prediction"], 0)

        # Retrieve user machines
        get_res = self.client.get("/api/machines")
        self.assertEqual(get_res.status_code, 200)
        machines = get_res.get_json()["machines"]
        self.assertGreaterEqual(len(machines), 1)
        self.assertEqual(machines[0]["machine_name"], "HAAS-VF2-TEST")

        # Logout
        logout_res = self.client.post("/api/auth/logout")
        self.assertEqual(logout_res.status_code, 200)

        # Verify unauthenticated GET /api/machines returns 401
        unauth_res = self.client.get("/api/machines")
        self.assertEqual(unauth_res.status_code, 401)

    def test_08_cors_headers(self):
        """Test CORS headers are returned for frontend API consumers."""
        response = self.client.options(
            "/api/predict",
            headers={"Origin": "http://localhost:5173"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")
        self.assertEqual(response.headers.get("Access-Control-Allow-Credentials"), "true")

    def test_09_existing_ssr_routes(self):
        """Verify original server-rendered routes are preserved and functional."""
        res_login = self.client.get("/login")
        self.assertEqual(res_login.status_code, 200)
        self.assertIn(b"SmartMaintainAI", res_login.data)
        self.assertIn(b"Login", res_login.data)

        res_signup = self.client.get("/signup")
        self.assertEqual(res_signup.status_code, 200)
        self.assertIn(b"Create Your Account", res_signup.data)

        res_home = self.client.get("/")
        self.assertEqual(res_home.status_code, 302)  # Redirects to /login if not authenticated

    def test_10_auth_token_login_and_me(self):
        """Test authentication token generation, Bearer header, and X-Auth-Token validation."""
        test_user = f"tokenuser_{uuid.uuid4().hex[:8]}"
        test_pass = "secure_pass_456"

        # Register and check token in response
        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": test_pass}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        data = reg_res.get_json()
        self.assertIn("token", data)
        token = data["token"]
        self.assertTrue(bool(token))

        # Fresh client without cookies to simulate cross-site cookie blocking
        fresh_client = app.test_client()

        # Unauthenticated /api/auth/me should return authenticated: False
        unauth_me = fresh_client.get("/api/auth/me")
        self.assertEqual(unauth_me.status_code, 200)
        self.assertFalse(unauth_me.get_json()["authenticated"])

        # /api/auth/me with Authorization: Bearer <token>
        bearer_me = fresh_client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(bearer_me.status_code, 200)
        bearer_data = bearer_me.get_json()
        self.assertTrue(bearer_data["authenticated"])
        self.assertEqual(bearer_data["user"]["username"], test_user)

        # Another fresh client
        fresh_client2 = app.test_client()

        # /api/auth/me with X-Auth-Token header
        header_me = fresh_client2.get(
            "/api/auth/me",
            headers={"X-Auth-Token": token}
        )
        self.assertEqual(header_me.status_code, 200)
        self.assertTrue(header_me.get_json()["authenticated"])

        # Login endpoint also returns token
        fresh_client3 = app.test_client()
        login_res = fresh_client3.post(
            "/api/auth/login",
            data=json.dumps({"username": test_user, "password": test_pass}),
            content_type="application/json"
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("token", login_res.get_json())

    def test_11_machine_registration_with_token(self):
        """Test POST /api/machines succeeds using signed Bearer token without cookies."""
        test_user = f"machinetoken_{uuid.uuid4().hex[:8]}"
        test_pass = "secure_token_pwd"

        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": test_pass}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["token"]
        user_id = reg_res.get_json()["user"]["id"]

        # Fresh client with zero cookies
        fresh_client = app.test_client()

        # Register machine with Bearer token header only
        machine_payload = {
            "name": "HAAS-TOKEN-TEST",
            "qualityType": "H",
            "airTemperature": 299.0,
            "processTemperature": 309.5,
            "rotationalSpeed": 1520,
            "torque": 38.5,
            "toolWear": 15,
            "manufacturer": "Haas",
            "modelNumber": "VF-3",
            "location": "Bay 9"
        }
        post_res = fresh_client.post(
            "/api/machines",
            data=json.dumps(machine_payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(post_res.status_code, 201)
        res_data = post_res.get_json()
        self.assertTrue(res_data["success"])
        self.assertEqual(res_data["machine"]["machine_name"], "HAAS-TOKEN-TEST")
        self.assertEqual(res_data["machine"]["owner_id"], user_id)

    def test_12_machine_registration_unauthenticated_rejection(self):
        """Test POST /api/machines strictly returns HTTP 401 when no valid auth is supplied."""
        fresh_client = app.test_client()

        machine_payload = {
            "name": "UNAUTH-MACHINE",
            "qualityType": "M",
            "airTemperature": 300.0,
            "processTemperature": 310.0,
            "rotationalSpeed": 1500,
            "torque": 40.0,
            "toolWear": 0
        }

        # Request with no cookies and no auth headers
        unauth_res = fresh_client.post(
            "/api/machines",
            data=json.dumps(machine_payload),
            content_type="application/json"
        )
        self.assertEqual(unauth_res.status_code, 401)
        data = unauth_res.get_json()
        self.assertFalse(data.get("authenticated", True))
        self.assertIn("Authentication required", data.get("error", ""))

    def test_13_register_machine_zero_tool_wear_regression(self):
        """
        Regression test: Register machine with exact values:
        - Air Temperature: 300
        - Process Temperature: 310
        - Rotational Speed: 1500
        - Torque: 40
        - Tool Wear: 0
        Verifies Tool Wear = 0 is safely accepted without falsy rejection,
        and machine registration succeeds with HTTP 201 and valid prediction.
        """
        test_user = f"zerowear_{uuid.uuid4().hex[:8]}"
        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": "password123"}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["token"]

        fresh_client = app.test_client()

        payload = {
            "name": "CNC Milling Machine ZeroWear",
            "qualityType": "M",
            "air_temperature": 300,
            "process_temperature": 310,
            "rotational_speed": 1500,
            "torque": 40,
            "tool_wear": 0,
            "manufacturer": "Haas",
            "model_number": "VF-2",
            "location": "Bay 1",
            "installation_year": 2024
        }

        response = fresh_client.post(
            "/api/machines",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        machine = data["machine"]
        self.assertEqual(machine["air_temperature"], 300.0)
        self.assertEqual(machine["process_temperature"], 310.0)
        self.assertEqual(machine["rotational_speed"], 1500.0)
        self.assertEqual(machine["torque"], 40.0)
        self.assertEqual(machine["tool_wear"], 0.0)
        self.assertEqual(machine["prediction"], 0)
        self.assertEqual(machine["prediction_label"], "No Failure Predicted")
        self.assertLess(machine["failure_probability"], 50.0)
        self.assertEqual(machine["risk_level"], "LOW")

    def test_14_register_machine_string_measurements_and_zero(self):
        """Test numeric strings are safely converted to numbers and zero is accepted."""
        test_user = f"strnum_{uuid.uuid4().hex[:8]}"
        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": "password123"}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["token"]

        fresh_client = app.test_client()

        payload = {
            "name": "String Value CNC",
            "machine_type": "L",
            "airTemperature": "300.5",
            "processTemperature": "310.8",
            "rotationalSpeed": "1500",
            "torque": "40.2",
            "toolWear": "0"
        }

        response = fresh_client.post(
            "/api/machines",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 201)
        machine = response.get_json()["machine"]
        self.assertEqual(machine["tool_wear"], 0.0)
        self.assertEqual(machine["torque"], 40.2)
        self.assertEqual(machine["rotational_speed"], 1500.0)

    def test_15_numeric_measurements_strict_validation(self):
        """Test non-numeric, NaN, infinite, and negative measurements are strictly rejected."""
        test_user = f"valuser_{uuid.uuid4().hex[:8]}"
        reg_res = self.client.post(
            "/api/auth/register",
            data=json.dumps({"username": test_user, "password": "password123"}),
            content_type="application/json"
        )
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        fresh_client = app.test_client()

        # Non-numeric string
        res_nonnum = fresh_client.post(
            "/api/machines",
            data=json.dumps({
                "name": "Bad Machine",
                "machine_type": "M",
                "air_temperature": "three-hundred",
                "process_temperature": 310,
                "rotational_speed": 1500,
                "torque": 40,
                "tool_wear": 0
            }),
            content_type="application/json",
            headers=headers
        )
        self.assertEqual(res_nonnum.status_code, 400)
        self.assertIn("Valid numeric values required for all measurements", res_nonnum.get_json()["error"])

        # Negative air temperature
        res_neg = fresh_client.post(
            "/api/machines",
            data=json.dumps({
                "name": "Bad Machine",
                "machine_type": "M",
                "air_temperature": -10,
                "process_temperature": 310,
                "rotational_speed": 1500,
                "torque": 40,
                "tool_wear": 0
            }),
            content_type="application/json",
            headers=headers
        )
        self.assertEqual(res_neg.status_code, 400)

        # Negative tool wear
        res_neg_wear = fresh_client.post(
            "/api/machines",
            data=json.dumps({
                "name": "Bad Machine",
                "machine_type": "M",
                "air_temperature": 300,
                "process_temperature": 310,
                "rotational_speed": 1500,
                "torque": 40,
                "tool_wear": -5
            }),
            content_type="application/json",
            headers=headers
        )
        self.assertEqual(res_neg_wear.status_code, 400)


if __name__ == "__main__":
    unittest.main()

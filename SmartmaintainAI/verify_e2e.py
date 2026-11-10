"""
Live End-to-End HTTP Verification Script
Validates the Flask server over real TCP/HTTP on localhost:5000.
"""

import sys
import time
import subprocess
import json
import urllib.request
import urllib.error
import uuid

def run():
    print("Starting Flask backend on http://localhost:5000...")
    proc = subprocess.Popen(
        [sys.executable, "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    try:
        # Wait for server to come up
        time.sleep(3)
        base_url = "http://localhost:5000"

        # 1. Health check
        print("\n[1] Testing GET /api/health...")
        req = urllib.request.Request(f"{base_url}/api/health")
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 200, f"Health check failed with {res.status}"
            body = json.loads(res.read().decode())
            print(f"    Health Status: {body.get('status')}")
            print(f"    Model Loaded: {body.get('model_loaded')}")
            print(f"    Model Type: {body.get('model_type')}")

        # 2. Register user & get token
        username = f"user_{uuid.uuid4().hex[:6]}"
        password = "test_password_123"
        print(f"\n[2] Testing POST /api/auth/register (user: {username})...")
        reg_payload = json.dumps({"username": username, "password": password}).encode()
        reg_req = urllib.request.Request(
            f"{base_url}/api/auth/register",
            data=reg_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(reg_req, timeout=5) as res:
            assert res.status == 201, f"Registration failed with {res.status}"
            reg_body = json.loads(res.read().decode())
            token = reg_body.get("token")
            user_id = reg_body.get("user", {}).get("id")
            print(f"    User Registered: ID={user_id}, Name={username}")
            print(f"    Token generated: {token[:20]}... (len={len(token) if token else 0})")
            assert token, "No token returned in registration response!"

        # 3. Test /api/auth/me using Bearer token (no cookies)
        print("\n[3] Testing GET /api/auth/me with Authorization: Bearer <token> (zero cookies)...")
        me_req = urllib.request.Request(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(me_req, timeout=5) as res:
            assert res.status == 200, f"/api/auth/me failed with {res.status}"
            me_body = json.loads(res.read().decode())
            print(f"    Authenticated: {me_body.get('authenticated')}")
            print(f"    Current User: {me_body.get('user')}")
            assert me_body.get("authenticated") is True, "Token auth failed on /api/auth/me"

        # 4. Test Machine Registration with Exact User Parameters (including Tool Wear = 0)
        print("\n[4] Testing POST /api/machines with Bearer token & exact user parameters (Tool Wear = 0)...")
        machine_payload = json.dumps({
            "name": "Live Test CNC 5000",
            "qualityType": "M",
            "airTemperature": 300,
            "air_temperature": 300,
            "processTemperature": 310,
            "process_temperature": 310,
            "rotationalSpeed": 1500,
            "rotational_speed": 1500,
            "torque": 40,
            "toolWear": 0,
            "tool_wear": 0,
            "manufacturer": "Mazak",
            "modelNumber": "VTC-800",
            "location": "Bay 1 - Live Verification",
            "installationYear": 2024
        }).encode()
        mach_req = urllib.request.Request(
            f"{base_url}/api/machines",
            data=machine_payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "X-Auth-Token": token,
                "X-User-Id": str(user_id)
            }
        )
        with urllib.request.urlopen(mach_req, timeout=5) as res:
            assert res.status == 201, f"Machine registration failed with {res.status}"
            mach_body = json.loads(res.read().decode())
            print(f"    Machine Registered Successfully! Status: {res.status}")
            print(f"    Machine Name: {mach_body.get('machine', {}).get('machine_name')}")
            print(f"    AI Inference Label: {mach_body.get('machine', {}).get('prediction_label')}")
            print(f"    AI Failure Probability: {mach_body.get('machine', {}).get('failure_probability')}%")
            print(f"    Owner ID: {mach_body.get('machine', {}).get('owner_id')}")

        # 5. Test Unauthenticated Rejection (HTTP 401)
        print("\n[5] Testing POST /api/machines without auth (verifying strict 401 enforcement)...")
        unauth_req = urllib.request.Request(
            f"{base_url}/api/machines",
            data=machine_payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(unauth_req, timeout=5) as res:
                print(f"    UNEXPECTED: Request succeeded with status {res.status}")
                assert False, "Unauthenticated request should have been rejected with 401!"
        except urllib.error.HTTPError as e:
            assert e.code == 401, f"Expected 401 but got {e.code}"
            err_body = json.loads(e.read().decode())
            print(f"    HTTP 401 correctly returned: {err_body.get('error')}")

        print("\nAll 5 live end-to-end verification checks PASSED successfully!")

    finally:
        print("\nStopping Flask backend process...")
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("Flask backend process stopped.")

if __name__ == "__main__":
    run()


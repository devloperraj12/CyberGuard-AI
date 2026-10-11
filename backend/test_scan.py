import httpx


BASE_URL = "http://127.0.0.1:8000"

EMAIL = "test@cyberguard.local"
PASSWORD = "TestPassword123!"

TARGET = "https://example.com"


print("=" * 60)
print("CyberGuard AI End-to-End Scan Test")
print("=" * 60)


with httpx.Client(timeout=30.0) as client:

    # -------------------------------------------------
    # 1. Login
    # -------------------------------------------------

    login_response = client.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": EMAIL,
            "password": PASSWORD,
        },
    )

    print(f"Login status: {login_response.status_code}")

    if login_response.status_code != 200:
        print("Login failed:")
        print(login_response.text)
        raise SystemExit(1)

    login_data = login_response.json()
    token = login_data["access_token"]

    print("Login: SUCCESS")
    print("JWT received: YES")
    print()


    # -------------------------------------------------
    # 2. Start authorized security scan
    # -------------------------------------------------

    scan_response = client.post(
        f"{BASE_URL}/scan",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "target_url": TARGET,
            "scan_type": "basic",
            "authorized": True,
        },
    )

    print(f"POST /scan status: {scan_response.status_code}")

    if scan_response.status_code not in {200, 201}:
        print("Scan failed:")
        print(scan_response.text)
        raise SystemExit(1)

    scan_data = scan_response.json()

    print("Scan: SUCCESS")
    print()
    print("Scan response:")
    print(scan_data)
    print()


    # -------------------------------------------------
    # 3. Verify scan ID
    # -------------------------------------------------

    scan_id = scan_data.get("scan_id")

    if not scan_id:
        print("ERROR: Scan response did not contain an ID.")
        raise SystemExit(1)

    print(f"Scan ID: {scan_id}")


    # -------------------------------------------------
    # 4. Retrieve scan from database
    # -------------------------------------------------

    get_scan_response = client.get(
        f"{BASE_URL}/scans/{scan_id}",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    print(f"GET /scans/{scan_id} status: {get_scan_response.status_code}")

    if get_scan_response.status_code != 200:
        print("Failed to retrieve saved scan:")
        print(get_scan_response.text)
        raise SystemExit(1)

    saved_scan = get_scan_response.json()

    print("Saved scan retrieval: SUCCESS")
    print()
    print("Saved scan:")
    print(saved_scan)
    print()


    # -------------------------------------------------
    # 5. Verify important fields
    # -------------------------------------------------

    checks = {
        "Target": saved_scan.get("target") is not None,
        "Scan type": saved_scan.get("scan_type") == "basic",
        "Status": saved_scan.get("status") == "completed",
        "Security score": saved_scan.get("security_score") is not None,
        "Findings": isinstance(saved_scan.get("findings"), list),
    }

    print("----- Verification -----")

    all_passed = True

    for check_name, passed in checks.items():
        print(f"{check_name}: {'PASS' if passed else 'FAIL'}")

        if not passed:
            all_passed = False

    print("=" * 60)

    if all_passed:
        print("END-TO-END SCAN TEST: SUCCESS")
    else:
        print("END-TO-END SCAN TEST: FAILED")

    print("=" * 60)

    if not all_passed:
        raise SystemExit(1)

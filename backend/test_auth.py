import httpx


BASE_URL = "http://127.0.0.1:8000"

EMAIL = "test@cyberguard.local"
PASSWORD = "TestPassword123!"


print("=" * 50)
print("CyberGuard AI Authentication Test")
print("=" * 50)


with httpx.Client() as client:

    # -------------------------------------------------
    # Login
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
    # Current user
    # -------------------------------------------------

    me_response = client.get(
        f"{BASE_URL}/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    print(f"/auth/me status: {me_response.status_code}")
    print()

    print("Response:")
    print(me_response.text)

    print("=" * 50)

    if me_response.status_code == 200:
        print("AUTHENTICATION TEST: SUCCESS")
    else:
        print("AUTHENTICATION TEST: FAILED")

    print("=" * 50)
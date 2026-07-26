import asyncio
import httpx
import uuid

BASE_URL = "http://localhost:8000"

async def test_driver_registration_flow():
    print("=== Testing Driver Registration & Account Creation Module ===")
    
    unique_suffix = str(uuid.uuid4())[:6]
    test_phone = f"9988{unique_suffix}"[:10]
    test_email = f"driver_{unique_suffix}@moveon.com"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Draft Saving & Retrieval
        print("\n1. Testing Draft Saving & Retrieval...")
        draft_payload = {
            "phone_number": test_phone,
            "draft_data": {
                "firstName": "Testing",
                "lastName": "Driver",
                "city": "Bengaluru",
                "step": 2
            }
        }
        draft_res = await client.post("/driver/auth/draft", json=draft_payload)
        assert draft_res.status_code == 200, f"Draft save failed: {draft_res.text}"
        print("   ✅ Draft saved successfully.")

        get_draft_res = await client.get(f"/driver/auth/draft/{test_phone}")
        assert get_draft_res.status_code == 200
        assert get_draft_res.json()["draft_data"]["city"] == "Bengaluru"
        print("   ✅ Draft restored successfully.")

        # 2. Driver Registration (Step 1 Basic Info + Address + Emergency Contact + Password)
        print("\n2. Testing Driver Registration API...")
        reg_payload = {
            "first_name": "Ramesh",
            "last_name": "Kumar",
            "phone_number": test_phone,
            "email": test_email,
            "dob": "1992-05-20",
            "gender": "MALE",
            "profile_photo_url": "https://example.com/photos/ramesh.jpg",
            "preferred_language": "kn",

            "emergency_contact_name": "Sunita Kumar",
            "emergency_contact_phone": "9900112233",
            "emergency_contact_relationship": "Spouse",

            "street_address": "42 MG Road, Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560038",
            "landmark": "Near Metro Station",

            "password": "SecurePassword123!"
        }

        reg_res = await client.post("/driver/auth/register", json=reg_payload)
        assert reg_res.status_code == 201, f"Driver registration failed: {reg_res.text}"
        data = reg_res.json()

        assert "access_token" in data
        assert "driver" in data
        driver = data["driver"]
        assert driver["driver_id_code"].startswith("DRV-")
        assert driver["account_status"] == "REGISTERED"
        assert driver["verification_status"] == "PENDING"
        assert driver["onboarding_status"] == "STEP1_BASIC_INFO"
        assert driver["online_status"] == "OFFLINE"
        assert driver["wallet_balance"] == 0.0
        assert driver["rating"] == 0.0
        print(f"   ✅ Driver registered! DRV Code: {driver['driver_id_code']}, Initial Status: REGISTERED, Verification: PENDING.")

        # 3. Prevent Duplicates
        print("\n3. Testing Duplicate Registration Prevention...")
        dup_res = await client.post("/driver/auth/register", json=reg_payload)
        assert dup_res.status_code == 400
        print(f"   ✅ Duplicate registration rejected: {dup_res.json()['detail']}")

        # 4. Driver OTP Request & Verification
        print("\n4. Testing Driver Mobile OTP Verification...")
        otp_req = await client.post("/driver/auth/request-otp", json={
            "phone_number": test_phone,
            "role": "DRIVER"
        })
        assert otp_req.status_code == 200
        dev_otp = otp_req.json().get("dev_otp", "123456")

        otp_ver = await client.post("/driver/auth/verify-otp", json={
            "phone_number": test_phone,
            "otp_code": dev_otp,
            "device_info": "E2E Test Agent"
        })
        assert otp_ver.status_code == 200, f"OTP verification failed: {otp_ver.text}"
        print("   ✅ Driver mobile OTP verified successfully.")

        # 5. Driver Password Login
        print("\n5. Testing Driver Password Authentication...")
        login_res = await client.post("/driver/auth/login", json={
            "phone_number": test_phone,
            "password": "SecurePassword123!"
        })
        assert login_res.status_code == 200, f"Driver login failed: {login_res.text}"
        assert "access_token" in login_res.json()
        print("   ✅ Driver password login successful.")

        # 6. Fetch Driver Profile / Me
        print("\n6. Testing Driver Profile API (/me)...")
        me_res = await client.get(f"/driver/auth/me?phone_number={test_phone}")
        assert me_res.status_code == 200
        me = me_res.json()
        assert me["first_name"] == "Ramesh"
        assert me["emergency_contact"]["name"] == "Sunita Kumar"
        assert me["address"]["city"] == "Bengaluru"
        print("   ✅ Driver profile details verified.")

    print("\n🎉 ALL E2E DRIVER REGISTRATION & AUTHENTICATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_driver_registration_flow())

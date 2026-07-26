import asyncio
import httpx
import uuid

BASE_URL = "http://localhost:8000"

async def test_driver_onboarding_flow():
    print("=== Testing Driver Onboarding REST APIs ===")
    
    unique_suffix = str(uuid.uuid4())[:6]
    test_phone = f"9555{unique_suffix}"[:10]
    test_email = f"onboarding_drv_{unique_suffix}@moveon.com"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Register basic info (Step 1)
        print("\n1. Registering Driver Basic Info...")
        reg_payload = {
            "first_name": "Ramesh",
            "last_name": "Onboarded",
            "phone_number": test_phone,
            "email": test_email,
            "dob": "1994-06-10",
            "gender": "MALE",
            "profile_photo_url": "https://example.com/photos/drv_selfie.jpg",
            "preferred_language": "en",
            "emergency_contact_name": "Wife",
            "emergency_contact_phone": "9900112244",
            "emergency_contact_relationship": "Spouse",
            "street_address": "88 Residency Rd",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560025",
            "landmark": "Near Post Office",
            "password": "SecurePassword123!"
        }
        reg_res = await client.post("/driver/auth/register", json=reg_payload)
        assert reg_res.status_code == 201, f"Reg failed: {reg_res.text}"
        print("   ✅ Driver registration successful.")

        # 2. Get initial onboarding status
        print("\n2. Checking Onboarding Status (Initial)...")
        status_res = await client.get(f"/driver/onboarding/status?phone_number={test_phone}")
        assert status_res.status_code == 200
        status_info = status_res.json()
        assert status_info["onboarding_status"] == "STEP1_BASIC_INFO"
        assert status_info["verification_status"] == "PENDING"
        assert status_info["uploaded_documents"] == []
        assert status_info["has_vehicle"] is False
        assert status_info["has_bank"] is False
        print("   ✅ Initial status correctly reports STEP1_BASIC_INFO and empty documents/vehicle/bank.")

        # 3. Submit documents (DL, Aadhaar, PAN)
        print("\n3. Submitting Driving Licence, Aadhaar, and PAN Cards...")
        dl_res = await client.post(f"/driver/onboarding/documents?phone_number={test_phone}", json={
            "document_type": "DL",
            "document_number": f"DL-{unique_suffix.upper()}",
            "file_url": "https://example.com/dl.jpg"
        })
        assert dl_res.status_code == 200

        aadhaar_res = await client.post(f"/driver/onboarding/documents?phone_number={test_phone}", json={
            "document_type": "AADHAAR",
            "document_number": f"AD-{unique_suffix.upper()}",
            "file_url": "https://example.com/aadhaar.jpg"
        })
        assert aadhaar_res.status_code == 200

        pan_res = await client.post(f"/driver/onboarding/documents?phone_number={test_phone}", json={
            "document_type": "PAN",
            "document_number": f"PN-{unique_suffix.upper()}",
            "file_url": "https://example.com/pan.jpg"
        })
        assert pan_res.status_code == 200
        print("   ✅ Driving License, Aadhaar, and PAN submissions successful.")

        # 4. Submit Vehicle details
        print("\n4. Submitting Driver Vehicle Details...")
        veh_res = await client.post(f"/driver/onboarding/vehicle?phone_number={test_phone}", json={
            "vehicle_number": f"KA-03-MR-{unique_suffix.upper()}",
            "make": "Maruti Suzuki",
            "model": "Swift Dzire",
            "year": 2021,
            "category": "SEDAN",
            "rc_number": f"RC-{unique_suffix.upper()}",
            "rc_url": "https://example.com/rc.jpg",
            "insurance_url": "https://example.com/ins.jpg",
            "puc_url": "https://example.com/puc.jpg"
        })
        assert veh_res.status_code == 200, f"Vehicle submit failed: {veh_res.text}"
        print("   ✅ Vehicle details registered successfully.")

        # 5. Submit Bank Details
        print("\n5. Submitting Bank & UPI Payout Details...")
        bank_res = await client.post(f"/driver/onboarding/bank?phone_number={test_phone}", json={
            "account_number": "987654321098",
            "ifsc_code": "SBIN0001234",
            "account_holder_name": "Ramesh Onboarded",
            "bank_name": "State Bank of India",
            "upi_id": "ramesh@upi"
        })
        assert bank_res.status_code == 200, f"Bank submit failed: {bank_res.text}"
        print("   ✅ Bank and UPI details registered successfully.")

        # 6. Select Subscription Plan
        print("\n6. Selecting Subscription Plan...")
        sub_res = await client.post(f"/driver/onboarding/subscription?phone_number={test_phone}", json={
            "plan_name": "PRO"
        })
        assert sub_res.status_code == 200
        print("   ✅ Subscription plan selected successfully.")

        # 7. Final Submission (Selfie + Agreement)
        print("\n7. Final Onboarding Submission for Admin Review...")
        submit_res = await client.post(f"/driver/onboarding/submit?phone_number={test_phone}", json={
            "agreement_accepted": True,
            "selfie_url": "https://example.com/selfie.jpg"
        })
        assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
        print("   ✅ Final onboarding submitted successfully.")

        # 8. Check updated status (Completed / Pending Admin Review)
        print("\n8. Re-checking Onboarding Status (Final)...")
        status_res = await client.get(f"/driver/onboarding/status?phone_number={test_phone}")
        assert status_res.status_code == 200
        status_info = status_res.json()
        assert status_info["onboarding_status"] == "COMPLETED"
        assert status_info["verification_status"] == "UNDER_REVIEW"
        assert "DL" in status_info["uploaded_documents"]
        assert "SELFIE" in status_info["uploaded_documents"]
        assert status_info["has_vehicle"] is True
        assert status_info["has_bank"] is True
        print("   ✅ Final status correctly reports COMPLETED onboarding and UNDER_REVIEW verification.")

    print("\n🎉 ALL DRIVER ONBOARDING FLOW E2E TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_driver_onboarding_flow())
